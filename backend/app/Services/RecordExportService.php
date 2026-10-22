<?php

namespace App\Services;

use App\Models\UserAccount;
use App\Support\Mobile;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use ZipArchive;

/**
 * AI Data Management "Export records": verified (or flagged) records by college and batch, as CSV or Excel, in the
 * import template's columns so a file round-trips. Archived and merged records are left out, passwords never exist
 * here, and every download is written to audit_log (entity alumni_export).
 */
class RecordExportService
{
    public const STATUSES = ['verified', 'flagged'];

    /** Template columns, then the Membership ID (ignored on import). */
    private const HEADER = ['Student no.', 'Full name', 'College', 'Program', 'Year graduated', 'Personal email', 'Mobile', 'Membership ID'];

    public function __construct(private readonly AuditService $audit) {}

    /**
     * @param  array{college_id?: int|null, batch?: int|null, status?: string|null}  $f
     * @return array{total: int, rows: list<array<string, mixed>>, colleges: list<array<string, mixed>>, batches: list<int>}
     */
    public function preview(array $f): array
    {
        [$where, $params] = self::where($f);
        $total = (int) DB::selectOne('SELECT count(*) AS n FROM '.self::FROM." WHERE {$where}", $params)->n;
        $rows = DB::select(self::SELECT.' FROM '.self::FROM." WHERE {$where} ".self::ORDER.' LIMIT 5', $params);
        // The chips: colleges and the latest batches that have records with this status.
        [$base, $baseParams] = self::where(['status' => $f['status'] ?? 'verified']);
        $colleges = DB::select(
            'SELECT c.college_id AS id, c.code, c.name, count(*) AS n FROM '.self::FROM." WHERE {$base} AND c.college_id IS NOT NULL
             GROUP BY c.college_id, c.code, c.name, c.sort_order ORDER BY c.sort_order",
            $baseParams,
        );
        $batches = array_map(fn ($r) => (int) $r->y, DB::select('SELECT DISTINCT a.year_graduated AS y FROM '.self::FROM." WHERE {$base} ORDER BY 1 DESC LIMIT 3", $baseParams));

        return [
            'total' => $total,
            'rows' => array_map(fn ($r) => ['membershipId' => $r->membership_id, 'studentNo' => $r->student_no, 'name' => self::name($r), 'program' => $r->program, 'year' => (int) $r->year_graduated], $rows),
            'colleges' => array_map(fn ($c) => ['id' => (int) $c->id, 'code' => $c->code, 'name' => $c->name, 'count' => (int) $c->n], $colleges),
            'batches' => $batches,
        ];
    }

    /**
     * The file (and the audit row). `format` is csv or xlsx.
     *
     * @param  array{college_id?: int|null, batch?: int|null, status?: string|null}  $f
     * @return array{body: string, name: string, type: string, count: int}
     */
    public function file(array $f, string $format, UserAccount $actor): array
    {
        [$where, $params] = self::where($f);
        $rows = DB::select(self::SELECT.' FROM '.self::FROM." WHERE {$where} ".self::ORDER, $params);
        $table = [self::HEADER];
        foreach ($rows as $r) {
            $table[] = [(string) $r->student_no, self::fileName($r), (string) $r->college_name, (string) $r->program, (string) $r->year_graduated,
                (string) $r->email, Mobile::display($r->mobile_no), (string) $r->membership_id];
        }
        $college = empty($f['college_id']) ? 'All colleges' : (string) DB::table('college')->where('college_id', $f['college_id'])->value('code');
        $batch = empty($f['batch']) ? 'All years' : (string) $f['batch'];
        $status = $f['status'] ?? 'verified';
        $name = 'UDM_Alumni_Export_'.str_replace(' ', '', $college).'_'.str_replace(' ', '', $batch).($status === 'flagged' ? '_Flagged' : '').'.'.$format;

        DB::transaction(fn () => $this->audit->log('records_export', 'alumni_export', null, $actor->user_id, [
            'count' => count($rows), 'college' => $college, 'batch' => $batch, 'status' => $status, 'format' => $format === 'csv' ? 'CSV' : 'Excel',
        ]));

        return $format === 'csv'
            ? ['body' => "\u{FEFF}".self::csv($table), 'name' => $name, 'type' => 'text/csv; charset=utf-8', 'count' => count($rows)]
            : ['body' => self::xlsx($table), 'name' => $name, 'type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'count' => count($rows)];
    }

    private const SELECT = <<<'SQL'
        SELECT a.membership_id, a.student_no, a.first_name, a.middle_name, a.last_name, a.suffix, a.year_graduated, c.name AS college_name,
               COALESCE(p.abbr, a.course_other) AS program, COALESCE(u.email, a.contact_email) AS email, a.mobile_no
        SQL;

    private const FROM = <<<'SQL'
        alumnus a
          LEFT JOIN program p ON p.program_id = a.program_id
          LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
          LEFT JOIN user_account u ON u.user_id = a.user_id
        SQL;

    private const ORDER = 'ORDER BY a.year_graduated DESC, lower(a.last_name), lower(a.first_name), a.alumni_id';

    /** @return array{0: string, 1: list<mixed>} */
    private static function where(array $f): array
    {
        $where = ['a.merged_into_id IS NULL', 'a.archived_at IS NULL', 'a.verification_status = ?::verification_status'];
        $params = [$f['status'] ?? 'verified'];
        if (! empty($f['college_id'])) {
            $where[] = 'c.college_id = ?';
            $params[] = (int) $f['college_id'];
        }
        if (! empty($f['batch'])) {
            $where[] = 'a.year_graduated = ?';
            $params[] = (int) $f['batch'];
        }

        return [implode(' AND ', $where), $params];
    }

    private static function name(object $r): string
    {
        return implode(' ', array_filter([$r->first_name, $r->middle_name, $r->last_name, $r->suffix]));
    }

    /** "Dela Cruz, Juan M. Jr.": the registrar's order, which the importer splits back without guessing. */
    private static function fileName(object $r): string
    {
        return $r->last_name.', '.implode(' ', array_filter([$r->first_name, $r->middle_name, $r->suffix]));
    }

    /** @param  list<list<string>>  $table */
    private static function csv(array $table): string
    {
        $q = fn (string $v) => '"'.str_replace('"', '""', preg_match('/^[=+\-@]/', $v) ? "'".$v : $v).'"';

        return implode("\r\n", array_map(fn ($row) => implode(',', array_map($q, $row)), $table))."\r\n";
    }

    /**
     * A one-sheet .xlsx (inline strings, bold header, frozen first row).
     *
     * @param  list<list<string>>  $table
     */
    private static function xlsx(array $table): string
    {
        $x = fn (string $v) => htmlspecialchars($v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $col = function (int $i): string {
            $s = '';
            for ($i++; $i > 0; $i = intdiv($i - 1, 26)) {
                $s = chr(65 + ($i - 1) % 26).$s;
            }

            return $s;
        };
        $sheet = '';
        foreach ($table as $r => $row) {
            $cells = '';
            foreach ($row as $c => $v) {
                $ref = $col($c).($r + 1);
                $cells .= $r > 0 && $c === 4 && ctype_digit($v)
                    ? "<c r=\"{$ref}\"><v>{$v}</v></c>"
                    : "<c r=\"{$ref}\" t=\"inlineStr\"".($r === 0 ? ' s="1"' : '')."><is><t xml:space=\"preserve\">{$x($v)}</t></is></c>";
            }
            $sheet .= '<row r="'.($r + 1).'">'.$cells.'</row>';
        }
        $widths = '<cols>'.implode('', array_map(fn ($w, $i) => '<col min="'.($i + 1).'" max="'.($i + 1).'" width="'.$w.'" customWidth="1"/>', [14, 32, 36, 14, 15, 32, 16, 18], array_keys(self::HEADER))).'</cols>';

        $files = [
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Alumni" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
            'xl/styles.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'.$widths.'<sheetData>'.$sheet.'</sheetData></worksheet>',
        ];

        $path = tempnam(sys_get_temp_dir(), 'udmx');
        $zip = new ZipArchive;
        if ($path === false || $zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the Excel file.');
        }
        foreach ($files as $name => $xml) {
            $zip->addFromString($name, $xml);
        }
        $zip->close();
        $body = (string) file_get_contents($path);
        @unlink($path);

        return $body;
    }
}

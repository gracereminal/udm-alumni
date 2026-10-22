<?php

namespace App\Support;

use App\Exceptions\ApiException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Reads a registrar masterlist (CSV or .xlsx) into template rows for AI Data Management. The header row is found by
 * its column names, so extra columns and a title row above the header are fine. Cells are kept as text; the
 * validator (ImportService) does the cleaning.
 */
final class Masterlist
{
    public const MAX_ROWS = 2000;

    /** The import template, which the export writes too (so data round-trips). */
    public const TEMPLATE = [
        'student_no' => 'Student no.', 'name' => 'Full name', 'college' => 'College', 'program' => 'Program',
        'year' => 'Year graduated', 'contact' => 'Personal email / mobile',
    ];

    private const MAX_SHEET_BYTES = 40 * 1024 * 1024;

    private const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    /**
     * @return array{columns: list<array{key: string, label: string, found: bool}>, rows: list<array{row_no: int, source: array<string, string>}>}
     */
    public static function read(string $path, string $extension): array
    {
        $table = match (strtolower($extension)) {
            'csv', 'txt' => self::csv($path),
            'xlsx' => self::xlsx($path),
            default => throw self::invalid('Upload a CSV or Excel (.xlsx) file. Older .xls files: save them as .xlsx first.'),
        };

        [$headerRow, $map] = self::header($table);
        $keys = array_flip($map);
        $hasName = isset($keys['name']) || (isset($keys['last_name']) && isset($keys['first_name']));
        $columns = [];
        foreach (self::TEMPLATE as $key => $label) {
            $found = match ($key) {
                'name' => $hasName,
                'contact' => isset($keys['contact']) || isset($keys['email']) || isset($keys['mobile']),
                default => isset($keys[$key]),
            };
            $columns[] = ['key' => $key, 'label' => $label, 'found' => $found];
        }
        $missing = array_values(array_filter([
            $hasName ? null : 'Full name', isset($keys['program']) ? null : 'Program', isset($keys['year']) ? null : 'Year graduated',
        ]));
        if ($missing !== []) {
            throw self::invalid('The file is missing the '.implode(', ', $missing).' column'.(count($missing) > 1 ? 's' : '').'. Use the template: '.implode(', ', self::TEMPLATE).'.');
        }

        $rows = [];
        foreach ($table as $rowNo => $cells) {
            if ($rowNo <= $headerRow) {
                continue;
            }
            $source = [];
            foreach ($map as $i => $key) {
                $v = self::clean($cells[$i] ?? '');
                if ($v === '') {
                    continue;
                }
                if ($key === 'contact') {
                    // "maria@gmail.com / 0917 555 0142": the token with @ is the email, the rest the mobile number.
                    foreach (preg_split('/[\s,;\/|]+/', $v, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $part) {
                        $k = str_contains($part, '@') ? 'email' : 'mobile';
                        $source[$k] = trim(($source[$k] ?? '').' '.$part);
                    }
                } else {
                    $source[$key] = isset($source[$key]) ? $source[$key].' '.$v : $v;
                }
            }
            if ($source !== []) {
                $rows[] = ['row_no' => $rowNo, 'source' => $source];
            }
        }
        if ($rows === []) {
            throw self::invalid('The file has a header row but no alumni rows.');
        }
        if (count($rows) > self::MAX_ROWS) {
            throw self::invalid('Import at most '.number_format(self::MAX_ROWS).' rows at a time. Split the masterlist into smaller files.');
        }

        return ['columns' => $columns, 'rows' => $rows];
    }

    /**
     * The first of the top rows that names at least two template columns, and its column index → field key.
     *
     * @param  array<int, list<string>>  $table
     * @return array{0: int, 1: array<int, string>}
     */
    private static function header(array $table): array
    {
        $checked = 0;
        foreach ($table as $rowNo => $cells) {
            $map = [];
            foreach ($cells as $i => $cell) {
                $key = self::headerKey($cell);
                if ($key !== null && ! in_array($key, $map, true)) {
                    $map[$i] = $key;
                }
            }
            if (count($map) >= 2) {
                return [$rowNo, $map];
            }
            if (++$checked >= 10) {
                break;
            }
        }

        throw self::invalid('No header row found. The first row should name the columns: '.implode(', ', self::TEMPLATE).'.');
    }

    private static function headerKey(string $cell): ?string
    {
        $h = trim((string) preg_replace('/[^a-z0-9]+/', ' ', strtolower($cell)));
        if ($h === '') {
            return null;
        }
        $email = preg_match('/\be ?mail\b/', $h) === 1;
        $phone = preg_match('/\b(mobile|phone|cell|cellphone|contact)\b/', $h) === 1;

        return match (true) {
            preg_match('/\bstud(ent)?\b.*\b(no|number|num|id)\b|^(id|id no|id number|student id)$/', $h) === 1 => 'student_no',
            in_array($h, ['last name', 'lastname', 'surname', 'family name'], true) => 'last_name',
            in_array($h, ['first name', 'firstname', 'given name', 'given names'], true) => 'first_name',
            in_array($h, ['middle name', 'middlename', 'middle initial', 'mi', 'm i'], true) => 'middle_name',
            $email && $phone => 'contact',
            $email => 'email',
            $phone => 'mobile',
            preg_match('/\bname\b/', $h) === 1 => 'name',
            preg_match('/\b(college|department|dept)\b/', $h) === 1 => 'college',
            preg_match('/\b(program|programme|course|degree)\b/', $h) === 1 => 'program',
            preg_match('/\b(year|batch|graduat\w*)\b/', $h) === 1 => 'year',
            default => null,
        };
    }

    /** @return array<int, list<string>> row number (1-based) → cells */
    private static function csv(string $path): array
    {
        $text = (string) @file_get_contents($path);
        $text = (string) preg_replace('/^\xEF\xBB\xBF/', '', $text);
        if (! mb_check_encoding($text, 'UTF-8')) {
            $text = (string) mb_convert_encoding($text, 'UTF-8', 'Windows-1252'); // Excel's "CSV" on Windows
        }
        $first = strtok($text, "\n") ?: '';
        $delimiter = collect([',', ';', "\t"])->sortByDesc(fn ($d) => substr_count($first, $d))->first();

        $fh = fopen('php://memory', 'r+');
        fwrite($fh, $text);
        rewind($fh);
        $table = [];
        $rowNo = 0;
        while (($cells = fgetcsv($fh, null, $delimiter, '"', '')) !== false) {
            $rowNo++;
            if ($cells !== [null]) {
                $table[$rowNo] = array_map(fn ($c) => (string) $c, $cells);
            }
        }
        fclose($fh);

        return $table;
    }

    /** @return array<int, list<string>> the first worksheet; row number → cells */
    private static function xlsx(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::RDONLY) !== true) {
            throw self::invalid('This Excel file could not be opened. Save it again as .xlsx or .csv.');
        }
        try {
            $shared = [];
            if (($xml = self::entry($zip, 'xl/sharedStrings.xml')) !== null) {
                foreach (self::xml($xml)->si as $si) {
                    $shared[] = self::richText($si);
                }
            }
            $sheet = self::entry($zip, self::firstSheetPath($zip)) ?? throw self::invalid('This Excel file has no worksheet.');

            $table = [];
            $next = 0;
            foreach (self::xml($sheet)->sheetData->row ?? [] as $row) {
                $rowNo = isset($row['r']) ? (int) $row['r'] : $next + 1;
                $next = $rowNo;
                $cells = [];
                $col = 0;
                foreach ($row->c as $c) {
                    $col = isset($c['r']) ? self::columnIndex((string) $c['r']) : $col + 1;
                    $cells[$col - 1] = match ((string) ($c['t'] ?? '')) {
                        's' => $shared[(int) $c->v] ?? '',
                        'inlineStr' => self::richText($c->is),
                        default => (string) $c->v,
                    };
                }
                if ($cells !== []) {
                    $max = max(array_keys($cells));
                    $table[$rowNo] = array_map(fn ($i) => $cells[$i] ?? '', range(0, $max));
                }
            }

            return $table;
        } finally {
            $zip->close();
        }
    }

    private static function firstSheetPath(ZipArchive $zip): string
    {
        $fallback = 'xl/worksheets/sheet1.xml';
        $wb = self::entry($zip, 'xl/workbook.xml');
        $rels = self::entry($zip, 'xl/_rels/workbook.xml.rels');
        if ($wb === null || $rels === null) {
            return $fallback;
        }
        $sheet = self::xml($wb)->sheets->sheet[0] ?? null;
        $rid = $sheet === null ? null : (string) ($sheet->attributes(self::NS_REL)['id'] ?? '');
        foreach (self::xml($rels)->Relationship as $rel) {
            if ((string) $rel['Id'] === $rid) {
                $target = ltrim((string) $rel['Target'], '/');

                return str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
            }
        }

        return $fallback;
    }

    private static function entry(ZipArchive $zip, string $name): ?string
    {
        $stat = $zip->statName($name);
        if ($stat === false) {
            return null;
        }
        if ($stat['size'] > self::MAX_SHEET_BYTES) {
            throw self::invalid('This Excel file is too large. Import at most '.number_format(self::MAX_ROWS).' rows at a time.');
        }
        $data = $zip->getFromName($name);

        return $data === false ? null : $data;
    }

    private static function xml(string $xml): SimpleXMLElement
    {
        $doc = simplexml_load_string($xml, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);

        return $doc === false ? throw self::invalid('This Excel file is damaged. Save it again as .xlsx or .csv.') : $doc;
    }

    /** Text of a shared / inline string: plain <t>, or the runs of a formatted one. */
    private static function richText(?SimpleXMLElement $si): string
    {
        if ($si === null) {
            return '';
        }
        $text = (string) $si->t;
        foreach ($si->r as $run) {
            $text .= (string) $run->t;
        }

        return $text;
    }

    /** "C12" → 3 */
    private static function columnIndex(string $ref): int
    {
        $n = 0;
        foreach (str_split((string) preg_replace('/[^A-Z]/', '', strtoupper($ref))) as $ch) {
            $n = $n * 26 + (ord($ch) - 64);
        }

        return max(1, $n);
    }

    private static function clean(string $v): string
    {
        $v = str_replace("\u{00A0}", ' ', $v);

        return trim((string) preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $v));
    }

    private static function invalid(string $message): ApiException
    {
        return new ApiException(422, $message, 'invalid_file', ['file' => $message]);
    }
}

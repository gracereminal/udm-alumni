<?php

namespace App\Services;

use App\Support\Scope;
use Illuminate\Support\Facades\DB;

/**
 * Report data for the five report types, in the shape the Reports screen renders (KPIs, chart bars, table, findings).
 * Every number comes from StatsService, so Reports agrees with the dashboards. Exports are built client-side
 * (CSV / Excel / PDF); the API records each export in report_export.
 */
class ReportsService
{
    public const TYPES = [
        ['id' => 'ched', 'name' => 'UDM Alumni Survey — Form A', 'desc' => 'Mandated institutional submission covering employment status, relevance of degree and months before first job, for the last five graduating batches.', 'cadence' => 'Annual'],
        ['id' => 'employability', 'name' => 'Employability by Program', 'desc' => 'Per-program employment rate against the university target, with batch-on-batch movement.', 'cadence' => 'Quarterly'],
        ['id' => 'coverage', 'name' => 'Batch Coverage Audit', 'desc' => 'Traced versus total graduates for each batch, with unreached counts for follow-up.', 'cadence' => 'Monthly'],
        ['id' => 'employer', 'name' => 'Employer & Industry Distribution', 'desc' => 'Where graduates are absorbed, by industry sector — employer counts only, no named alumni.', 'cadence' => 'On demand'],
        ['id' => 'inclusion', 'name' => 'Inclusion Profile — IP & PWD', 'desc' => 'Indigenous Peoples and Persons with Disability (Yes / No) among respondents, with employment outcomes per group. Aggregated counts only.', 'cadence' => 'Annual'],
    ];

    public function __construct(
        private readonly StatsService $stats,
        private readonly SettingsService $settings,
    ) {}

    /** @return list<string> */
    public static function typeIds(): array
    {
        return array_column(self::TYPES, 'id');
    }

    /**
     * The report's batch window: `from` / `to` in either order (one of them alone is a single batch), or by
     * default the last five graduating batches (Manila year).
     *
     * @return array{from: int, to: int, list: list<int>}
     */
    public static function batches(?int $from = null, ?int $to = null): array
    {
        if ($from === null && $to === null) {
            $y = (int) now('Asia/Manila')->year;
            [$from, $to] = [$y - 4, $y];
        }
        $lo = min($from ?? $to, $to ?? $from);
        $hi = max($from ?? $to, $to ?? $from);

        return ['from' => $lo, 'to' => $hi, 'list' => range($lo, $hi)];
    }

    /**
     * @param  array{college_id?: ?int, program_id?: ?int, batch_from?: ?int, batch_to?: ?int}  $f
     * @return array<string, mixed>
     */
    public function data(Scope $scope, string $type, array $f = []): array
    {
        $s = $this->settings->all();
        $empT = (float) $s['employment_target'];
        $covT = (float) $s['coverage_target'];
        $B = self::batches(isset($f['batch_from']) ? (int) $f['batch_from'] : null, isset($f['batch_to']) ? (int) $f['batch_to'] : null);
        $collegeId = $scope->role === 'dept' ? $scope->collegeId : ($f['college_id'] ?? null);
        $program = empty($f['program_id']) ? null : DB::table('program')->where('program_id', $f['program_id'])
            ->when($collegeId !== null, fn ($q) => $q->where('college_id', $collegeId))->first(['program_id', 'abbr', 'name', 'college_id']);
        $college = $collegeId === null ? null : DB::table('college')->where('college_id', $collegeId)->first(['college_id', 'code', 'name']);
        $level = $program ? 'batch' : ($college ? 'course' : 'college');
        $filters = ['college_id' => $college?->college_id, 'program_id' => $program?->program_id, 'batch_from' => $B['from'], 'batch_to' => $B['to']];
        $group = ['college' => 'college', 'course' => 'program', 'batch' => 'batch'][$level];

        $tot = $this->stats->aggregate($scope, $filters);
        $units = $this->stats->label($this->stats->aggregate($scope, $filters, $group), $group);
        $raw = collect($this->stats->aggregate($scope, $filters, 'batch'))->keyBy('key');
        // Every batch in the window appears, even with no records yet.
        $byBatch = array_map(fn (int $y) => ($raw[$y] ?? ['key' => $y, 'total' => 0, 'traced' => 0, 'untraced' => 0, 'coverage' => null, 'employmentRate' => null, 'employed' => 0, 'notEmployed' => 0, 'alignedRate' => null, 'monthsAvg' => null, 'ip' => 0, 'pwd' => 0])
            + ['label' => (string) $y, 'full' => "Batch {$y}"], $B['list']);
        $list = $level === 'batch' ? $byBatch : $units;

        $unitHead = ['college' => 'College', 'course' => 'Program', 'batch' => 'Batch'][$level];
        $plural = strtolower($unitHead).($level === 'batch' ? 'es' : 's');
        $scopeLabel = $program->name ?? $college->name ?? 'All colleges';
        $fileScope = $program->abbr ?? $college->code ?? 'All';
        $one = $B['from'] === $B['to'];
        $batchLabel = $one ? "Batch {$B['from']}" : "Batches {$B['from']}–{$B['to']}";
        $base = ['type' => $type, 'records' => self::n($tot['traced']), 'recordCount' => $tot['traced'], 'unitHead' => $unitHead, 'scope' => $scopeLabel,
            'batchLabel' => $batchLabel, 'batchRange' => $one ? (string) $B['from'] : "{$B['from']}-{$B['to']}", 'level' => $level, 'unit' => '%'];

        return match ($type) {
            'employability' => $this->employability($base, $tot, $list, $empT, $unitHead, $plural, $scopeLabel, $batchLabel, $level, $fileScope),
            'coverage' => $this->coverage($base, $tot, $byBatch, $units, $covT, $level, $fileScope),
            'employer' => $this->employer($base, $scope, $filters, $batchLabel, $fileScope),
            'inclusion' => $this->inclusion($base, $tot, $list, $units, $empT, $unitHead, $fileScope),
            default => $this->formA($base, $tot, $byBatch, $list, $empT, $unitHead, $B['to'], $fileScope),
        };
    }

    /**
     * "Last run" per type on the template cards; dept users see exports by accounts of their own college.
     *
     * @return array<string, string>
     */
    public function lastRuns(Scope $scope): array
    {
        return DB::table('report_export as e')->leftJoin('user_account as u', 'u.user_id', '=', 'e.generated_by')
            ->when($scope->role === 'dept', fn ($q) => $q->where('u.college_id', $scope->collegeId))
            ->groupBy('e.type')->selectRaw('e.type, max(e.created_at) AS last')->pluck('last', 'type')->all();
    }

    // --- Report types ----------------------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $tot
     * @param  list<array<string, mixed>>  $list
     * @return array<string, mixed>
     */
    private function employability(array $base, array $tot, array $list, float $empT, string $unitHead, string $plural, string $scopeLabel, string $batchLabel, string $level, string $fileScope): array
    {
        $above = array_filter($list, fn ($u) => ($u['employmentRate'] ?? 0) >= $empT);
        $b = self::best($list, 'employmentRate');
        $w = self::worst($list, 'employmentRate');
        $t = self::t($empT);

        return $base + [
            'file' => "UDM_Employability_{$fileScope}",
            'kpis' => [
                ['label' => 'Employment rate', 'value' => self::p($tot['employmentRate']), 'sub' => "target {$t}%"],
                ['label' => 'Above target', 'value' => count($above).' of '.count($list), 'sub' => $plural],
                ['label' => 'Highest', 'value' => self::p($b['employmentRate'] ?? null), 'sub' => $b['label'] ?? '—'],
                ['label' => 'Lowest', 'value' => self::p($w['employmentRate'] ?? null), 'sub' => $w['label'] ?? '—'],
            ],
            'chartTitle' => 'Employment rate by '.strtolower($unitHead), 'chartNote' => $level === 'batch' ? $scopeLabel : "{$batchLabel} combined", 'target' => $empT,
            'bars' => array_map(fn ($u) => [$u['label'], $u['employmentRate'] ?? 0], $list),
            'tableTitle' => 'Employability by '.strtolower($unitHead), 'grid' => '1.4fr 1fr 1fr 1fr 1fr',
            'cols' => [$unitHead, 'Traced', 'Employed', 'Unemployed', 'Rate'],
            'rows' => array_map(fn ($u) => [$u['label'], self::n($u['traced']), self::n($u['employed']), self::n($u['notEmployed']), self::p($u['employmentRate'])], $list),
            'findings' => [
                count($above).' of '.count($list)." {$plural} meet the {$t}% employment target.",
                $b ? "{$b['full']} has the highest employment rate at ".self::p($b['employmentRate']).'.' : 'No employment responses in this scope yet.',
                $w ? "{$w['full']} trails at ".self::p($w['employmentRate']).($w['employmentRate'] < $empT ? ' — below target and a candidate for placement support.' : '.') : 'Encourage alumni in this scope to answer the survey.',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $tot
     * @param  list<array<string, mixed>>  $byBatch
     * @param  list<array<string, mixed>>  $units
     * @return array<string, mixed>
     */
    private function coverage(array $base, array $tot, array $byBatch, array $units, float $covT, string $level, string $fileScope): array
    {
        $b = self::best($byBatch, 'coverage');
        $w = self::worst($byBatch, 'coverage');
        $low = self::worst($units, 'coverage');
        $t = self::t($covT);
        $below = count(array_filter($byBatch, fn ($u) => ($u['coverage'] ?? 0) < $covT));

        return $base + [
            'file' => "UDM_Batch-Coverage_{$fileScope}",
            'kpis' => [
                ['label' => 'Overall coverage', 'value' => self::p($tot['coverage']), 'sub' => self::n($tot['traced']).' of '.self::n($tot['total']).' graduates'],
                ['label' => 'Unreached', 'value' => self::n($tot['untraced']), 'sub' => 'need follow-up'],
                ['label' => 'Highest', 'value' => self::p($b['coverage'] ?? null), 'sub' => $b ? "Batch {$b['label']}" : '—'],
                ['label' => 'Lowest', 'value' => self::p($w['coverage'] ?? null), 'sub' => $w ? "Batch {$w['label']}" : '—'],
            ],
            'chartTitle' => 'Survey coverage by batch', 'chartNote' => 'Traced ÷ total graduates', 'target' => $covT,
            'bars' => array_map(fn ($u) => [$u['label'], $u['coverage'] ?? 0], $byBatch),
            'tableTitle' => 'Coverage by batch', 'grid' => '1fr 1fr 1fr 1fr 1fr',
            'cols' => ['Batch', 'Graduates', 'Traced', 'Coverage', 'Unreached'],
            'rows' => [
                ...array_map(fn ($u) => [$u['label'], self::n($u['total']), self::n($u['traced']), self::p($u['coverage']), self::n($u['total'] - $u['traced'])], $byBatch),
                ['Total', self::n($tot['total']), self::n($tot['traced']), self::p($tot['coverage']), self::n($tot['untraced'])],
            ],
            'findings' => [
                "{$below} of ".count($byBatch)." batches sit below the {$t}% coverage target.",
                $w ? "Batch {$w['label']} has the most room to improve, with ".self::n($w['total'] - $w['traced']).' graduates unreached.' : 'No records in this scope yet.',
                $level === 'batch' || ! $low ? 'Prioritise survey reminders for recent batches before the Form A deadline.' : "{$low['full']} has the lowest coverage (".self::p($low['coverage']).') — prioritise reminders there.',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function employer(array $base, Scope $scope, array $filters, string $batchLabel, string $fileScope): array
    {
        $s = $this->stats->sectors($scope, $filters);
        $list = $s['industries'];
        usort($list, fn ($a, $b) => (($a['key'] === 'Not specified') <=> ($b['key'] === 'Not specified')) ?: $b['n'] <=> $a['n']);
        $lead = $list[0] ?? null;

        return array_merge($base, [
            'records' => self::n($s['employed']), 'recordCount' => $s['employed'], 'file' => "UDM_Employer-Industry_{$fileScope}",
            'kpis' => [
                ['label' => 'Employed respondents', 'value' => self::n($s['employed']), 'sub' => strtolower($batchLabel)],
                ['label' => 'Distinct employers', 'value' => self::n($s['distinctEmployers']), 'sub' => 'self-reported'],
                ['label' => 'Top sector', 'value' => self::p($lead['share'] ?? null), 'sub' => $lead['key'] ?? '—'],
                ['label' => 'Sectors', 'value' => (string) count($list), 'sub' => 'represented'],
            ],
            'chartTitle' => 'Share of employed alumni by sector', 'chartNote' => 'Percent of employed respondents', 'target' => null,
            'bars' => array_map(fn ($x) => [$x['key'], $x['share'] ?? 0], $list),
            'tableTitle' => 'Sector detail', 'grid' => '1.4fr .9fr .8fr 1.3fr',
            'cols' => ['Sector', 'Alumni', 'Share', 'Top programs'],
            'rows' => array_map(fn ($x) => [$x['key'], self::n($x['n']), self::p($x['share']), implode(', ', $x['topPrograms'])], $list),
            'findings' => [
                $lead ? "{$lead['key']} is the largest absorber of graduates in this scope at ".self::p($lead['share']).'.' : 'No employed respondents in this scope yet.',
                'Sector mix is the major line of business each employed alumnus reported in the survey.',
                'Counts are aggregated by sector; no employer or alumni names are exported.',
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $tot
     * @param  list<array<string, mixed>>  $list
     * @param  list<array<string, mixed>>  $units
     * @return array<string, mixed>
     */
    private function inclusion(array $base, array $tot, array $list, array $units, float $empT, string $unitHead, string $fileScope): array
    {
        $t = $tot['traced'];
        $pc = fn ($n) => self::p($t ? $n / $t * 100 : null);
        $share = fn (string $k) => fn ($u) => $u['traced'] ? $u[$k] / $u['traced'] : null;
        $topIp = self::bestBy($units, $share('ip'));
        $topPwd = self::bestBy($units, $share('pwd'));
        $gap = $tot['nonPwdEmploymentRate'] !== null && $tot['pwdEmploymentRate'] !== null ? $tot['nonPwdEmploymentRate'] - $tot['pwdEmploymentRate'] : null;

        return $base + [
            'file' => "UDM_Inclusion-IP-PWD_{$fileScope}",
            'kpis' => [
                ['label' => 'Indigenous — Yes', 'value' => self::n($tot['ip']), 'sub' => $pc($tot['ip']).' of respondents'],
                ['label' => 'Indigenous — No', 'value' => self::n($t - $tot['ip']), 'sub' => $pc($t - $tot['ip']).' of respondents'],
                ['label' => 'PWD — Yes', 'value' => self::n($tot['pwd']), 'sub' => $pc($tot['pwd']).' of respondents'],
                ['label' => 'PWD — No', 'value' => self::n($t - $tot['pwd']), 'sub' => $pc($t - $tot['pwd']).' of respondents'],
            ],
            'chartTitle' => 'Employment rate by inclusion group', 'chartNote' => 'Share of respondents employed', 'target' => $empT,
            'bars' => [['IP — Yes', $tot['ipEmploymentRate'] ?? 0], ['IP — No', $tot['nonIpEmploymentRate'] ?? 0], ['PWD — Yes', $tot['pwdEmploymentRate'] ?? 0], ['PWD — No', $tot['nonPwdEmploymentRate'] ?? 0], ['All', $tot['employmentRate'] ?? 0]],
            'tableTitle' => 'IP & PWD respondents by '.strtolower($unitHead), 'grid' => '1.4fr 1fr .8fr .8fr .8fr .8fr',
            'cols' => [$unitHead, 'Respondents', 'IP Yes', 'IP No', 'PWD Yes', 'PWD No'],
            'rows' => [
                ...array_map(fn ($u) => [$u['label'], self::n($u['traced']), self::n($u['ip']), self::n($u['traced'] - $u['ip']), self::n($u['pwd']), self::n($u['traced'] - $u['pwd'])], $list),
                ['Total', self::n($t), self::n($tot['ip']), self::n($t - $tot['ip']), self::n($tot['pwd']), self::n($t - $tot['pwd'])],
            ],
            'findings' => [
                $pc($tot['ip']).' of respondents identify as members of an Indigenous People group; '.$pc($tot['pwd']).' are Persons with Disability.',
                match (true) {
                    $gap === null => 'Not enough PWD respondents yet to compare employment outcomes.',
                    $gap > 0 => sprintf('PWD respondents trail non-PWD peers on employment by %.1f pts — a candidate for targeted placement and accommodation support.', $gap),
                    default => 'PWD respondents are employed at '.self::p($tot['pwdEmploymentRate']).', on par with or above non-PWD peers ('.self::p($tot['nonPwdEmploymentRate']).').',
                },
                $topIp && $topPwd
                    ? "{$topIp['full']} has the highest IP share (".self::p($topIp['ip'] / $topIp['traced'] * 100)."); {$topPwd['full']} has the highest PWD share (".self::p($topPwd['pwd'] / $topPwd['traced'] * 100).').'
                    : 'Shares by unit appear once respondents are recorded.',
            ],
        ];
    }

    /**
     * Form A (ched).
     *
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $tot
     * @param  list<array<string, mixed>>  $byBatch
     * @param  list<array<string, mixed>>  $list
     * @return array<string, mixed>
     */
    private function formA(array $base, array $tot, array $byBatch, array $list, float $empT, string $unitHead, int $lastBatch, string $fileScope): array
    {
        $meet = count(array_filter($byBatch, fn ($u) => ($u['employmentRate'] ?? 0) >= $empT));
        $b = self::best($list, 'employmentRate');
        $lr = self::worst($list, 'alignedRate');
        $mo = fn ($v) => $v === null ? '—' : sprintf('%.1f mo', $v);
        $t = self::t($empT);

        return $base + [
            'file' => "UDM_Form-A_{$fileScope}",
            'kpis' => [
                ['label' => 'Employment rate', 'value' => self::p($tot['employmentRate']), 'sub' => 'of traced respondents in the labour force'],
                ['label' => 'Degree-relevant', 'value' => self::p($tot['alignedRate']), 'sub' => 'of employed respondents'],
                ['label' => 'Months Before First Job', 'value' => $mo($tot['monthsAvg']), 'sub' => 'average of bucket midpoints'],
                ['label' => 'Respondents', 'value' => self::n($tot['traced']), 'sub' => round($tot['coverage'] ?? 0).'% response rate'],
            ],
            'chartTitle' => 'Employment rate by graduating batch', 'chartNote' => 'Share of respondents employed', 'target' => $empT,
            'bars' => array_map(fn ($u) => [$u['label'], $u['employmentRate'] ?? 0], $byBatch),
            'tableTitle' => "{$unitHead} breakdown", 'grid' => '1.4fr 1fr 1fr 1fr 1fr',
            'cols' => [$unitHead, 'Respondents', 'Employed', 'Degree-relevant', 'Time to 1st job'],
            'rows' => array_map(fn ($u) => [$u['label'], self::n($u['traced']), self::p($u['employmentRate']), self::p($u['alignedRate']), $mo($u['monthsAvg'])], $list),
            'findings' => [
                "{$meet} of ".count($byBatch)." batches meet the {$t}% employment target; Batch {$lastBatch} is still within its first year after graduation.",
                $b ? "{$b['full']} leads on employment at ".self::p($b['employmentRate']).'.' : 'No employment responses in this scope yet.',
                $lr ? "{$lr['full']} has the lowest degree-relevant rate (".self::p($lr['alignedRate']).') — a candidate for curriculum and placement review.' : 'Degree relevance appears once employed alumni answer the survey.',
            ],
        ];
    }

    // --- Formatting ------------------------------------------------------------------------------------

    private static function n(int|float|null $v): string
    {
        return number_format((float) ($v ?? 0));
    }

    private static function p(int|float|null $v): string
    {
        return $v === null ? '—' : sprintf('%.1f%%', $v);
    }

    /** 60.0 -> "60", 62.5 -> "62.5" */
    private static function t(float $v): string
    {
        return rtrim(rtrim(number_format($v, 1, '.', ''), '0'), '.');
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>|null
     */
    private static function best(array $rows, string $key): ?array
    {
        return self::bestBy($rows, fn ($u) => $u[$key] ?? null);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>|null
     */
    private static function worst(array $rows, string $key): ?array
    {
        return self::bestBy($rows, fn ($u) => isset($u[$key]) ? -$u[$key] : null);
    }

    /**
     * The row with the highest score (first one on ties); rows scoring null are skipped.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>|null
     */
    private static function bestBy(array $rows, callable $score): ?array
    {
        $best = null;
        $top = null;
        foreach ($rows as $r) {
            $s = $score($r);
            if ($s !== null && ($top === null || $s > $top)) {
                [$best, $top] = [$r, $s];
            }
        }

        return $best;
    }
}

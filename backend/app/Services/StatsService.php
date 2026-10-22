<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Support\Scope;
use Illuminate\Support\Facades\DB;

/**
 * The only place statistics are computed (sync rule 2). Every number is a SUM over v_stats_grain, or for distinct
 * counts and breakdowns the same filters over v_alumni_current, so every screen agrees by construction. Dept users are
 * always pinned to their own college; the client never sends a scope. Definitions: plan-backend "Metric definitions".
 */
class StatsService
{
    public const TTJ = ['lt_1m', 'm1_6', 'm7_11', 'y1_2', 'y2_3', 'y3_4', 'gt_4y'];

    private const SUMS = ['total', 'traced', 'completion_sum', 'completed', 'employed', 'wage_employed', 'self_employed',
        'further_studies', 'not_employed', 'aligned', 'first_gen', 'ip', 'ip_employed', 'ip_further', 'pwd', 'pwd_employed',
        'pwd_further', 'months_n'];

    private const GROUPS = ['batch' => 'batch', 'college' => 'college_id', 'program' => 'program_id'];

    public function __construct(private readonly SettingsService $settings) {}

    /**
     * Stat filters (snake_case query parameters): college_id, program_id, unmapped, batch, batch_from, batch_to,
     * batches (list), status (verified|flagged).
     *
     * @param  array<string, mixed>  $f
     * @return array{0: string, 1: list<mixed>} WHERE clause (or ''), bindings
     */
    public function where(Scope $scope, array $f, string $alias = ''): array
    {
        if ($scope->role === 'alumni') {
            throw ApiException::forbidden('Statistics are for staff accounts.');
        }
        $p = $alias === '' ? '' : "{$alias}.";
        $where = [];
        $params = [];
        $college = $scope->role === 'dept' ? $scope->collegeId : ($f['college_id'] ?? null);
        if ($college !== null) {
            $where[] = "{$p}college_id = ?";
            $params[] = (int) $college;
        }
        if (! empty($f['program_id'])) {
            $where[] = "{$p}program_id = ?";
            $params[] = (int) $f['program_id'];
        }
        if (! empty($f['unmapped'])) {
            $where[] = "{$p}program_id IS NULL";
        }
        foreach (['batch' => '=', 'batch_from' => '>=', 'batch_to' => '<='] as $k => $op) {
            if (! empty($f[$k])) {
                $where[] = "{$p}batch {$op} ?";
                $params[] = (int) $f[$k];
            }
        }
        if (! empty($f['batches'])) {
            $list = array_map('intval', (array) $f['batches']);
            $where[] = "{$p}batch IN (".implode(',', array_fill(0, count($list), '?')).')';
            array_push($params, ...$list);
        }
        if (! empty($f['status'])) {
            $where[] = "{$p}verification_status = ?::verification_status";
            $params[] = $f['status'];
        }

        return [$where === [] ? '' : 'WHERE '.implode(' AND ', $where), $params];
    }

    /**
     * Aggregate over v_stats_grain, optionally grouped by batch | college | program.
     *
     * @param  array<string, mixed>  $f
     * @return array<string, mixed>|list<array<string, mixed>>
     */
    public function aggregate(Scope $scope, array $f = [], ?string $groupBy = null): array
    {
        [$w, $params] = $this->where($scope, $f);
        $settings = $this->settings->all();
        $select = implode(",\n", [
            ...array_map(fn ($c) => "COALESCE(sum({$c}), 0)::int AS {$c}", [...self::SUMS, ...array_map(fn ($k) => "ttj_{$k}", self::TTJ)]),
            'COALESCE(sum(months_sum), 0)::numeric AS months_sum',
            "COALESCE(sum(total) FILTER (WHERE verification_status = 'verified'), 0)::int AS verified",
            "COALESCE(sum(total) FILTER (WHERE verification_status = 'flagged'), 0)::int AS flagged",
        ]);
        $g = $groupBy === null ? null : (self::GROUPS[$groupBy] ?? throw new ApiException(422, 'Unknown group.', 'validation'));
        $rows = DB::select($g === null
            ? "SELECT {$select} FROM v_stats_grain {$w}"
            : "SELECT {$g} AS key, {$select} FROM v_stats_grain {$w} GROUP BY {$g} ORDER BY {$g} NULLS LAST", $params);

        if ($g === null) {
            return self::metrics($rows[0], $settings);
        }

        return array_map(fn ($r) => ['key' => $r->key === null ? null : (int) $r->key] + self::metrics($r, $settings), $rows);
    }

    /**
     * Raw sums -> the metric object every screen uses.
     *
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public static function metrics(object $r, array $settings): array
    {
        $excl = (bool) $settings['employment_rate_excludes_further_studies'];
        $labour = $excl ? $r->traced - $r->further_studies : $r->traced;
        $ipLabour = $excl ? $r->ip - $r->ip_further : $r->ip;
        $pwdLabour = $excl ? $r->pwd - $r->pwd_further : $r->pwd;

        return [
            'total' => $r->total,
            'traced' => $r->traced,
            'untraced' => $r->total - $r->traced,
            'coverage' => self::pct($r->traced, $r->total),
            'completion' => $r->traced ? round($r->completion_sum / $r->traced, 1) : null,
            'completed' => $r->completed,
            'employed' => $r->employed,
            'wageEmployed' => $r->wage_employed,
            'selfEmployed' => $r->self_employed,
            'furtherStudies' => $r->further_studies,
            'notEmployed' => $r->not_employed,
            'laborForce' => $labour,
            'employmentRate' => self::pct($r->employed, $labour),
            'aligned' => $r->aligned,
            'alignedRate' => self::pct($r->aligned, $r->employed),
            'firstGen' => $r->first_gen,
            'firstGenRate' => self::pct($r->first_gen, $r->traced),
            'ip' => $r->ip,
            'ipEmployed' => $r->ip_employed,
            'ipRate' => self::pct($r->ip, $r->traced),
            'ipEmploymentRate' => self::pct($r->ip_employed, $ipLabour),
            'nonIpEmploymentRate' => self::pct($r->employed - $r->ip_employed, $labour - $ipLabour),
            'pwd' => $r->pwd,
            'pwdEmployed' => $r->pwd_employed,
            'pwdRate' => self::pct($r->pwd, $r->traced),
            'pwdEmploymentRate' => self::pct($r->pwd_employed, $pwdLabour),
            'nonPwdEmploymentRate' => self::pct($r->employed - $r->pwd_employed, $labour - $pwdLabour),
            'monthsAvg' => $r->months_n ? round((float) $r->months_sum / $r->months_n, 1) : null,
            'timeToJob' => array_combine(self::TTJ, array_map(fn ($k) => $r->{"ttj_{$k}"}, self::TTJ)),
            'verified' => $r->verified,
            'flagged' => $r->flagged,
        ];
    }

    /**
     * Labels for grouped rows (college / program names; "Unmapped program" for typed-in courses).
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    public function label(array $rows, string $groupBy): array
    {
        if ($groupBy === 'batch') {
            return array_map(fn ($r) => $r + ['label' => (string) $r['key'], 'full' => "Batch {$r['key']}"], $rows);
        }
        if ($groupBy === 'college') {
            $by = DB::table('college')->get(['college_id', 'code', 'name'])->keyBy('college_id');

            return array_map(fn ($r) => $r + ['label' => $by[$r['key']]->code ?? '—', 'full' => $by[$r['key']]->name ?? 'Unknown college', 'collegeId' => $r['key']], $rows);
        }
        $by = DB::table('program')->get(['program_id', 'abbr', 'name', 'college_id'])->keyBy('program_id');

        return array_map(fn ($r) => $r['key'] === null
            ? $r + ['label' => 'Unmapped', 'full' => 'Unmapped program', 'programId' => null]
            : $r + ['label' => $by[$r['key']]->abbr ?? '—', 'full' => $by[$r['key']]->name ?? 'Unknown program', 'programId' => $r['key'], 'collegeId' => (int) ($by[$r['key']]->college_id ?? 0)], $rows);
    }

    /**
     * Sector / employer distribution among the employed (aggregated counts only; no names).
     *
     * @param  array<string, mixed>  $f
     * @return array<string, mixed>
     */
    public function sectors(Scope $scope, array $f = []): array
    {
        [$w, $params] = $this->where($scope, $f, 'v');
        $base = 'FROM v_alumni_current v LEFT JOIN program p ON p.program_id = v.program_id '.($w === '' ? 'WHERE' : "{$w} AND").' v.employed';
        $industries = DB::select("SELECT COALESCE(v.line_of_business, 'Not specified') AS key, count(*)::int AS n {$base} GROUP BY 1 ORDER BY 2 DESC, 1", $params);
        $orgTypes = DB::select("SELECT COALESCE(v.org_type::text, 'unspecified') AS key, count(*)::int AS n {$base} GROUP BY 1 ORDER BY 2 DESC, 1", $params);
        $occupations = DB::select("SELECT COALESCE(v.occupation_class, 'Not specified') AS key, count(*)::int AS n {$base} GROUP BY 1 ORDER BY 2 DESC, 1", $params);
        $titles = DB::select("SELECT initcap(lower(trim(v.job_title))) AS key, count(*)::int AS n {$base} AND coalesce(trim(v.job_title), '') <> '' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10", $params);
        $employers = (int) DB::selectOne("SELECT count(DISTINCT lower(trim(v.employer_name)))::int AS n {$base} AND coalesce(trim(v.employer_name), '') <> ''", $params)->n;
        $tops = [];
        foreach (DB::select("SELECT COALESCE(v.line_of_business, 'Not specified') AS sector, COALESCE(p.abbr, 'Unmapped') AS program, count(*)::int AS n {$base} GROUP BY 1, 2 ORDER BY 1, 3 DESC, 2", $params) as $r) {
            $tops[$r->sector][] = $r->program;
        }
        $employed = array_sum(array_map(fn ($r) => $r->n, $industries));

        return [
            'employed' => $employed,
            'distinctEmployers' => $employers,
            'industries' => array_map(fn ($r) => ['key' => $r->key, 'n' => $r->n, 'share' => self::pct($r->n, $employed), 'topPrograms' => array_slice($tops[$r->key] ?? [], 0, 2)], $industries),
            'orgTypes' => $orgTypes,
            'occupations' => $occupations,
            'topJobTitles' => $titles,
        ];
    }

    /**
     * IP / PWD breakdown by group and type among the traced (counts only; the Inclusion report never lists names).
     *
     * @param  array<string, mixed>  $f
     * @return array<string, mixed>
     */
    public function inclusion(Scope $scope, array $f = []): array
    {
        $m = $this->aggregate($scope, $f);
        [$w, $params] = $this->where($scope, $f, 'v');
        $base = 'FROM v_alumni_current v '.($w === '' ? 'WHERE' : "{$w} AND").' v.traced';

        return array_intersect_key($m, array_flip(['traced', 'ip', 'pwd', 'ipRate', 'pwdRate', 'ipEmploymentRate', 'nonIpEmploymentRate', 'pwdEmploymentRate', 'nonPwdEmploymentRate'])) + [
            'indigenousGroups' => DB::select("SELECT COALESCE(nullif(initcap(trim(v.indigenous_group)), ''), 'Not specified') AS key, count(*)::int AS n {$base} AND v.is_indigenous GROUP BY 1 ORDER BY 2 DESC, 1", $params),
            'pwdTypes' => DB::select("SELECT v.pwd_type::text AS key, count(*)::int AS n {$base} AND v.is_pwd GROUP BY 1 ORDER BY 2 DESC, 1", $params),
        ];
    }

    /**
     * Records page counters: the population by status, plus archived (outside the population).
     *
     * @param  array<string, mixed>  $f
     * @return array<string, mixed>
     */
    public function counters(Scope $scope, array $f = []): array
    {
        [$w, $params] = $this->where($scope, array_diff_key($f, ['status' => 1]));
        $r = DB::selectOne("SELECT COALESCE(sum(flagged), 0)::int AS flagged,
                                   COALESCE(sum(verified), 0)::int AS verified, COALESCE(sum(archived), 0)::int AS archived
                              FROM v_records_counters {$w}", $params);
        $scoped = 'FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.merged_into_id IS NULL'
            .($scope->role === 'dept' ? ' AND COALESCE(p.college_id, a.declared_college_id) = ?' : '');
        $sp = $scope->role === 'dept' ? [$scope->collegeId] : [];
        $x = DB::selectOne(
            "SELECT (SELECT max(a.updated_at) {$scoped}) AS last_updated_at,
                    (SELECT count(*)::int FROM record_review rr WHERE rr.action = 'verify' AND rr.created_at > now() - interval '7 days'
                        AND rr.alumni_id IN (SELECT a.alumni_id {$scoped})) AS verified_7d,
                    (SELECT COALESCE(json_agg(DISTINCT a.year_graduated ORDER BY a.year_graduated DESC), '[]') {$scoped}) AS batches",
            [...$sp, ...$sp, ...$sp],
        );

        return [
            'flagged' => $r->flagged, 'verified' => $r->verified, 'archived' => $r->archived,
            'active' => $r->flagged + $r->verified,
            'all' => $r->flagged + $r->verified + $r->archived,
            'lastUpdatedAt' => $x->last_updated_at,
            'verifiedLast7d' => $x->verified_7d,
            'batches' => json_decode((string) $x->batches, true),
        ];
    }

    /**
     * The outreach list (v_unresponsive) with the channels on file and the "N of M" counters from the same query.
     *
     * @param  array<string, mixed>  $f
     * @return array{rows: list<array<string, mixed>>, total: int, byReason: array<string, int>}
     */
    public function unresponsive(Scope $scope, array $f, int $page, int $perPage): array
    {
        [$w, $params] = $this->where($scope, array_diff_key($f, ['status' => 1]), 'u');
        if (! empty($f['reason'])) {
            $w .= ($w === '' ? 'WHERE' : ' AND').' u.reason = ?';
            $params[] = $f['reason'];
        }
        $rows = DB::select(
            "SELECT u.alumni_id, concat_ws(' ', u.first_name, u.last_name) AS name, u.batch, u.reason, u.last_contacted_at, u.last_contacted_via, u.last_contact_id,
                    u.email, u.facebook, u.created_at, COALESCE(p.abbr, 'Unmapped') AS program, count(*) OVER () AS total_count
               FROM v_unresponsive u LEFT JOIN program p ON p.program_id = u.program_id
               {$w}
              ORDER BY (u.reason = 'new') DESC, u.last_contacted_at NULLS FIRST, u.batch DESC, u.last_name, u.alumni_id
              LIMIT ? OFFSET ?",
            [...$params, $perPage, ($page - 1) * $perPage],
        );
        [$w2, $p2] = $this->where($scope, array_diff_key($f, ['status' => 1, 'reason' => 1]), 'u');
        $byReason = [];
        foreach (DB::select("SELECT reason, count(*)::int AS n FROM v_unresponsive u {$w2} GROUP BY reason", $p2) as $r) {
            $byReason[$r->reason] = $r->n;
        }
        $total = $rows === [] ? (int) DB::selectOne("SELECT count(*) AS n FROM v_unresponsive u {$w}", $params)->n : (int) $rows[0]->total_count;

        return [
            'rows' => array_map(fn ($r) => [
                'id' => (int) $r->alumni_id, 'name' => $r->name, 'program' => $r->program, 'batch' => (int) $r->batch, 'reason' => $r->reason,
                'lastContactedAt' => $r->last_contacted_at, 'lastContactedVia' => $r->last_contacted_via,
                'lastContactId' => $r->last_contact_id === null ? null : (int) $r->last_contact_id,
                'email' => $r->email, 'facebook' => $r->facebook, 'registeredAt' => $r->created_at,
            ], $rows),
            'total' => $total,
            'byReason' => $byReason,
        ];
    }

    public static function pct(int|float $n, int|float $d): ?float
    {
        return $d ? round($n / $d * 100, 1) : null;
    }
}

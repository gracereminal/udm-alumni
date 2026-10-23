<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Services\StorageService;
use App\Support\Lists;
use App\Support\Mobile;
use App\Support\Vocab;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Alumni directory for the search overlay, contact modal and alumni card (any signed-in user). Reads v_directory only:
 * opted-in alumni, visible links, and email / mobile only when the alumnus turned them on.
 */
class DirectoryController extends Controller
{
    private const EMPLOYMENT = ['employed' => 'Employed', 'self_employed' => 'Self-employed', 'further_studies' => 'Further studies', 'not_employed' => 'Not employed'];

    /** Columns one search word may match: every course and college, not only the searcher's own. */
    private const SEARCHABLE = ['d.name', 'd.degree', 'd.program_name', 'd.title', 'd.company', 'd.industry', 'd.skills::text', 'd.batch::text', 'c.name', 'c.code'];

    /** GET /directory?q&batch&page&per_page: every word of q must match one of the SEARCHABLE columns. */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => 'nullable|string|max:100', 'batch' => 'nullable|integer|between:1950,2100']);
        [$page, $per] = Lists::paging($request, 50);
        $where = [];
        $params = [];
        foreach (self::words($f['q'] ?? '') as $word) {
            $where[] = '('.implode(' OR ', array_map(fn ($col) => "{$col} ILIKE ?", self::SEARCHABLE)).')';
            array_push($params, ...array_fill(0, count(self::SEARCHABLE), Lists::like($word)));
        }
        if (! empty($f['batch'])) {
            $where[] = 'd.batch = ?';
            $params[] = (int) $f['batch'];
        }
        $w = $where === [] ? '' : 'WHERE '.implode(' AND ', $where);
        $from = 'FROM v_directory d LEFT JOIN college c ON c.college_id = d.college_id';
        $total = (int) DB::selectOne("SELECT count(*) AS n {$from} {$w}", $params)->n;
        $rows = DB::select("SELECT d.*, c.name AS college_name {$from} {$w} ORDER BY d.name, d.alumni_id LIMIT ? OFFSET ?", [...$params, $per, ($page - 1) * $per]);

        return response()->json(Lists::out(array_map(self::card(...), $rows), $total, $page, $per));
    }

    /**
     * GET /directory/accounts?q: active admin (Alumni Office) and college accounts, so anyone signed in can find and
     * email the office or a college. Only work contact details are returned.
     */
    public function accounts(Request $request): JsonResponse
    {
        $q = $request->validate(['q' => 'nullable|string|max:100'])['q'] ?? '';
        $where = ["u.role <> 'alumni'", "u.account_status = 'active'"];
        $params = [];
        foreach (self::words($q) as $word) {
            $where[] = '(u.display_name ILIKE ? OR u.role_label ILIKE ? OR u.email ILIKE ? OR c.name ILIKE ? OR c.code ILIKE ? OR (CASE WHEN u.role = \'admin\' THEN \'admin alumni office\' ELSE \'college\' END) ILIKE ?)';
            array_push($params, ...array_fill(0, 6, Lists::like($word)));
        }
        $rows = DB::select(
            'SELECT u.user_id AS id, u.display_name AS name, u.role, u.role_label AS "roleLabel", u.email, c.name AS college, c.code AS "collegeCode"
               FROM user_account u LEFT JOIN college c ON c.college_id = u.college_id
              WHERE '.implode(' AND ', $where).' ORDER BY u.role, c.sort_order, u.display_name, u.user_id LIMIT 50',
            $params,
        );

        return response()->json(['data' => $rows]);
    }

    /** @return list<string> */
    private static function words(string $q): array
    {
        return array_slice(preg_split('/\s+/', trim($q), -1, PREG_SPLIT_NO_EMPTY) ?: [], 0, 6);
    }

    /** GET /directory/:id */
    public function show(int $id): JsonResponse
    {
        $r = DB::selectOne('SELECT * FROM v_directory WHERE alumni_id = ?', [$id]) ?? throw ApiException::notFound('This alumnus is not listed in the directory.');

        return response()->json(self::card($r));
    }

    /** @return array<string, mixed> */
    private static function card(object $r): array
    {
        $skills = (array) json_decode((string) $r->skills, true);
        $contacts = (array) json_decode((string) $r->links, true);
        if ($r->email !== null) {
            $contacts['email'] = $r->email;
        }
        if ($r->mobile !== null) {
            $contacts['mobile'] = Mobile::display($r->mobile);
        }

        return [
            'id' => (int) $r->alumni_id,
            'name' => $r->name,
            'studentId' => $r->student_no ?? $r->membership_id,
            'degree' => $r->degree ?? '—',
            'program' => $r->program_name ?? $r->degree ?? '',
            'college' => $r->college_name ?? '',
            'batch' => (int) $r->batch,
            'title' => $r->title ?? '',
            'company' => $r->company ?? '',
            'status' => self::EMPLOYMENT[$r->employment_status] ?? '',
            'skills' => array_slice($skills, 0, 3),
            'more' => max(0, count($skills) - 3),
            'allSkills' => $skills,
            'photoUrl' => StorageService::publicUrl($r->photo_url),
            'profile' => [
                'industry' => $r->industry ?? '',
                'bio' => $r->bio ?? '',
                'since' => $r->since === null ? '' : (string) $r->since,
                'firstJob' => Vocab::label(Vocab::TIME_TO_JOB, $r->time_to_job_bucket),
                'related' => match ($r->course_relevance) {
                    'related' => 'Yes',
                    'not_related' => 'No',
                    default => '',
                },
                'contacts' => (object) $contacts,
            ],
        ];
    }
}

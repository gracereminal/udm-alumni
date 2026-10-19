<?php

namespace App\Support;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * The row filter for every list and stat query (sync rule 5). Built from the signed-in user on the server; the client
 * never sends a scope. admin → everything; dept → their college; alumni → their own record.
 *
 *   Scope::for($request->user())->apply(DB::table('v_alumni_current'))
 */
final class Scope
{
    private function __construct(
        public readonly string $role,
        public readonly ?int $collegeId,
        public readonly ?int $alumniId,
    ) {}

    public static function for(?UserAccount $user): self
    {
        if ($user === null) {
            throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
        }

        return match ($user->role) {
            'admin' => new self('admin', null, null),
            'dept' => new self('dept', $user->college_id ?? throw ApiException::forbidden(), null),
            default => new self('alumni', null, self::alumniIdOf($user->user_id)),
        };
    }

    /** The unscoped (admin) view, for university-wide rates that carry no counts (/stats/benchmark). */
    public static function all(): self
    {
        return new self('admin', null, null);
    }

    public function isAll(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Restricts a query over alumni rows. The columns default to the names in v_alumni_current; pass the qualified
     * names when the query joins (e.g. 'a.alumni_id', and a college expression column).
     *
     * @template T of Builder
     *
     * @param  T  $query
     * @return T
     */
    public function apply(Builder $query, string $collegeColumn = 'college_id', string $alumniColumn = 'alumni_id'): Builder
    {
        return match ($this->role) {
            'admin' => $query,
            'dept' => $query->where($collegeColumn, $this->collegeId),
            default => $query->where($alumniColumn, $this->alumniId ?? 0),
        };
    }

    /** Whether one alumnus is inside the scope (for single-record reads and writes). */
    public function allowsAlumnus(int $alumniId): bool
    {
        return match ($this->role) {
            'admin' => true,
            'dept' => self::collegeOf($alumniId) === $this->collegeId,
            default => $alumniId === $this->alumniId,
        };
    }

    public function allowsCollege(int $collegeId): bool
    {
        return $this->role === 'admin' || ($this->role === 'dept' && $collegeId === $this->collegeId);
    }

    /** Throws 403 unless the alumnus is in scope. */
    public function authorizeAlumnus(int $alumniId): void
    {
        if (! $this->allowsAlumnus($alumniId)) {
            throw ApiException::forbidden();
        }
    }

    private static function alumniIdOf(int $userId): ?int
    {
        $id = DB::table('alumnus')->where('user_id', $userId)->value('alumni_id');

        return $id === null ? null : (int) $id;
    }

    /** From the record itself, not v_alumni_current: archived and merged records still belong to a college (Records shows them). */
    private static function collegeOf(int $alumniId): ?int
    {
        $row = DB::selectOne(
            'SELECT COALESCE(p.college_id, a.declared_college_id) AS college_id
               FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.alumni_id = ?',
            [$alumniId],
        );

        return $row?->college_id === null ? null : (int) $row->college_id;
    }
}

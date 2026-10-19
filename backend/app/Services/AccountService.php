<?php

namespace App\Services;

use App\Models\UserAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** Sign-in lookups and the signed-in user payload the client keeps (replaces client/src/data/demoAccounts.js). */
class AccountService
{
    private static ?string $dummyHash = null;

    /**
     * The account for an email, or for an Alumni ID matched against both student_no and membership_id.
     * Staff accounts have no alumni record, so they sign in by email only.
     */
    public function findForLogin(string $identifier): ?UserAccount
    {
        $id = trim($identifier);
        if ($id === '') {
            return null;
        }

        return UserAccount::query()
            ->whereRaw('lower(email) = lower(?)', [$id])
            ->orWhereIn('user_id', fn ($q) => $q->select('user_id')->from('alumnus')
                ->whereNotNull('user_id')->whereNull('merged_into_id')
                ->where(fn ($w) => $w->whereRaw('upper(student_no) = upper(?)', [$id])->orWhereRaw('upper(membership_id) = upper(?)', [$id])))
            ->orderByRaw('lower(email) = lower(?) DESC', [$id])
            ->first();
    }

    /** Checks a password against a throwaway hash, so a missing account takes as long as a wrong password. */
    public function dummyCheck(string $password): void
    {
        self::$dummyHash ??= Hash::make('Dummy-password-1');
        Hash::check($password, self::$dummyHash);
    }

    /**
     * @return array{id: int, role: string, email: string, name: string, roleLabel: string, initials: string,
     *     college: ?string, collegeId: ?int, collegeCode: ?string, alumniId: ?int, membershipId: ?string,
     *     studentNo: ?string, mustChangePassword: bool}
     */
    public function payload(UserAccount $user): array
    {
        $row = DB::selectOne(
            'SELECT c.name AS college_name, c.code AS college_code, a.alumni_id, a.membership_id, a.student_no
               FROM user_account u
               LEFT JOIN college c ON c.college_id = u.college_id
               LEFT JOIN alumnus a ON a.user_id = u.user_id
              WHERE u.user_id = ?',
            [$user->user_id],
        );

        return [
            'id' => $user->user_id,
            'role' => $user->role,
            'email' => $user->email,
            'name' => $user->display_name,
            'roleLabel' => $user->role_label ?: match ($user->role) {
                'admin' => 'Administrator',
                'dept' => 'College Staff',
                default => 'Alumni',
            },
            'initials' => self::initials($user->display_name),
            'college' => $row?->college_name,
            'collegeId' => $user->college_id,
            'collegeCode' => $row?->college_code,
            'alumniId' => $row?->alumni_id,
            'membershipId' => $row?->membership_id,
            'studentNo' => $row?->student_no,
            'mustChangePassword' => (bool) $user->must_change_password,
        ];
    }

    public static function initials(string $name): string
    {
        $words = array_filter(preg_split('/\s+/', $name) ?: [], fn (string $w) => preg_match('/^\p{L}/u', $w) === 1);

        return mb_strtoupper(implode('', array_map(fn (string $w) => mb_substr($w, 0, 1), array_slice(array_values($words), 0, 2))));
    }

    /** Password rules shared by registration, reset and change (client/src/lib/validation.js). */
    public static function passwordOk(string $password): bool
    {
        return strlen($password) >= 8 && preg_match('/\d/', $password) === 1 && preg_match('/[A-Z]/', $password) === 1;
    }

    public const PASSWORD_MESSAGE = 'Use at least 8 characters, including 1 number and 1 uppercase letter.';

    /** A one-time password for app:create-user: 16 characters that always pass the password rules. */
    public static function oneTimePassword(): string
    {
        $base = str_replace(['+', '/', '='], 'x', base64_encode(random_bytes(12)));

        return substr($base, 0, 12).'A7'.substr($base, 12, 2);
    }
}

<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Support\Mobile;
use App\Support\Vocab;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Self-registration: user_account + alumnus + social links + record_review + audit_log + notifications, in one
 * transaction. The account is active right away (staff still verify the record), but no session is created here: the
 * alumnus signs in afterwards.
 */
class RegistrationService
{
    private const LINKS = ['facebook', 'twitter', 'instagram', 'linkedin'];

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array<string, mixed>  $a  a body that passed RegisterRequest
     * @return array{userId: int, alumniId: int, membershipId: string}
     */
    public function register(array $a): array
    {
        $t = fn (string $k): ?string => is_scalar($a[$k] ?? null) && trim((string) $a[$k]) !== '' ? trim((string) $a[$k]) : null;
        $email = (string) $t('email');
        $duplicate = fn () => new ApiException(409, 'An account with this email already exists.', 'email_taken', [
            'email' => 'An account with this email already exists. Sign in or reset your password.',
        ]);

        if (DB::table('user_account')->whereRaw('lower(email) = lower(?)', [$email])->exists()) {
            throw $duplicate();
        }
        $program = $this->resolveProgram((string) $t('college'), $t('course'), $t('course_other'));
        $name = trim($t('first_name').' '.$t('last_name'));
        $year = (int) $t('year_graduated');
        $hash = Hash::make((string) $a['reg_pw']);

        try {
            return DB::transaction(function () use ($a, $t, $email, $program, $name, $year, $hash) {
                $userId = (int) DB::table('user_account')->insertGetId([
                    'email' => $email, 'password_hash' => $hash, 'role' => 'alumni', 'display_name' => $name, 'account_status' => 'active',
                ], 'user_id');

                $membershipId = $this->nextMembershipId($year);
                $married = $t('marital_status') === 'Married';
                $alumniId = (int) DB::table('alumnus')->insertGetId([
                    'user_id' => $userId,
                    'membership_id' => $membershipId,
                    'program_id' => $program['programId'],
                    'course_other' => $program['courseOther'],
                    'declared_college_id' => $program['declaredCollegeId'],
                    'year_graduated' => $year,
                    'last_name' => $t('last_name'),
                    'first_name' => $t('first_name'),
                    'middle_name' => $t('middle_name'),
                    'suffix' => $t('suffix'),
                    'married_name' => $married ? $t('married_name') : null,
                    'birth_date' => $t('dob'),
                    'sex' => Vocab::code(Vocab::SEX, $t('gender')),
                    'civil_status' => Vocab::code(Vocab::CIVIL_STATUS, $t('marital_status')),
                    'present_address' => $t('present_address'),
                    'permanent_address' => ! empty($a['permanent_same']) ? $t('present_address') : $t('permanent_address'),
                    'mobile_no' => Mobile::normalize($t('mobile')),
                    'is_indigenous' => $t('indigenous') === 'Yes',
                    'indigenous_group' => $t('indigenous') === 'Yes' ? $t('indigenous_group') : null,
                    'pwd_type' => $t('pwd') === 'Yes' ? Vocab::code(Vocab::PWD_TYPE, $t('pwd_type')) : null,
                    'verification_status' => 'verified',
                    'record_source' => 'self_registration',
                    'privacy_consent_at' => now(),
                ], 'alumni_id');

                foreach (self::LINKS as $platform) {
                    if ($url = $t($platform)) {
                        DB::table('social_link')->insert(['alumni_id' => $alumniId, 'platform' => $platform, 'url' => $url, 'is_visible' => false]);
                    }
                }

                DB::table('record_review')->insert(['alumni_id' => $alumniId, 'reviewer_id' => $userId, 'action' => 'create', 'note' => 'Self-registration']);
                $this->audit->log('register', 'alumnus', $alumniId, $userId, ['membership_id' => $membershipId, 'email' => AuditService::maskEmail($email)]);

                $who = sprintf('%s (%s %d)', $name, $program['abbr'] ?? 'Unmapped program', $year);
                $this->notifications->notify(
                    [...$this->notifications->adminIds(), ...$this->notifications->deptIds($program['collegeId'])],
                    'registration', 'New alumni registration', "{$who} registered.", 'records',
                );

                return ['userId' => $userId, 'alumniId' => $alumniId, 'membershipId' => $membershipId];
            });
        } catch (UniqueConstraintViolationException) {
            throw $duplicate(); // a concurrent registration with the same email won the race
        }
    }

    /**
     * College (name or code) + program (name, code or abbreviation) → program_id, or a typed program with its
     * declared college ("Others", or a program missing from the list), counted as an unmapped program.
     *
     * @return array{programId: ?int, courseOther: ?string, declaredCollegeId: ?int, collegeId: int, abbr: ?string}
     */
    public function resolveProgram(string $college, ?string $course, ?string $courseOther): array
    {
        $c = DB::table('college')->where('name', $college)->orWhere('code', $college)->first(['college_id', 'code']);
        if ($c === null) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', ['college' => 'Select your college / department.']);
        }
        $collegeId = (int) $c->college_id;

        if ($course !== null) {
            $p = DB::table('program')->where('college_id', $collegeId)->where('is_active', true)
                ->where(fn ($q) => $q->where('name', $course)->orWhere('code', $course)->orWhere('abbr', $course))
                ->first(['program_id', 'abbr']);
            if ($p !== null) {
                return ['programId' => (int) $p->program_id, 'courseOther' => null, 'declaredCollegeId' => null, 'collegeId' => $collegeId, 'abbr' => $p->abbr];
            }
            if ($c->code !== 'OTH') {
                throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', ['course' => 'Select a program from the list, or indicate it under Others.']);
            }
        }

        return ['programId' => null, 'courseOther' => $courseOther ?? $course, 'declaredCollegeId' => $collegeId, 'collegeId' => $collegeId, 'abbr' => null];
    }

    /**
     * AM-YYYY-NNNNN (YYYY = class year) for every new record, self-registered or staff-created. Call inside a
     * transaction: the advisory lock serializes concurrent inserts so two never get the same number.
     */
    public function nextMembershipId(int $year): string
    {
        DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['membership_id']);
        $last = DB::selectOne("SELECT max(substring(membership_id from 9)::int) AS n FROM alumnus WHERE membership_id ~ ('^AM-' || ? || '-[0-9]{5}$')", [$year])->n;

        return sprintf('AM-%d-%05d', $year, ((int) $last) + 1);
    }
}

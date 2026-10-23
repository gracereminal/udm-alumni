<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Support\Mobile;
use App\Support\RegistrationRules;
use App\Support\Vocab;
use Illuminate\Support\Facades\DB;

/**
 * The signed-in alumnus' own record (/me). The profile is the same alumnus row Records shows (sync rule 1): Edit
 * Profile writes those columns, with record_review + audit_log. Answers use the client's form field ids.
 */
class ProfileService
{
    public const LINKS = ['facebook', 'twitter', 'instagram', 'linkedin'];

    /** Profile fields an alumnus can change (the registration steps minus the password). */
    public const FIELDS = [
        'last_name', 'first_name', 'middle_name', 'suffix', 'married_name', 'dob', 'gender', 'marital_status',
        'present_address', 'permanent_address', 'permanent_same', 'indigenous', 'indigenous_group', 'pwd', 'pwd_type',
        'mobile', 'email', 'facebook', 'twitter', 'instagram', 'linkedin', 'college', 'course', 'course_other', 'year_graduated',
    ];

    /** Not copied into the change log. */
    private const SENSITIVE = ['dob', 'pwd_type', 'indigenous_group', 'mobile', 'present_address', 'permanent_address'];

    /** One row per alumnus with everything answersFromRow() needs (also used in bulk by SurveyService::recomputeAll). */
    public const ANSWERS_SQL = <<<'SQL'
        SELECT a.*, u.email AS login_email, p.name AS program_name, c.name AS college_name,
               COALESCE((SELECT jsonb_object_agg(l.platform, l.url) FROM social_link l WHERE l.alumni_id = a.alumni_id), '{}'::jsonb) AS link_urls,
               r.response_id, r.completion_pct, r.answers AS response_answers
          FROM alumnus a
          LEFT JOIN user_account u ON u.user_id = a.user_id
          LEFT JOIN program p ON p.program_id = a.program_id
          LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
        SQL;

    public function __construct(
        private readonly AuditService $audit,
        private readonly RegistrationService $registration,
        private readonly StorageService $storage,
    ) {}

    /** @return array<string, mixed> */
    public static function answersFromRow(object $r): array
    {
        $links = (array) json_decode((string) $r->link_urls, true);
        $a = [
            'last_name' => $r->last_name, 'first_name' => $r->first_name, 'middle_name' => $r->middle_name ?? '', 'suffix' => $r->suffix ?? '',
            'married_name' => $r->married_name ?? '', 'dob' => $r->birth_date ?? '',
            'gender' => Vocab::label(Vocab::SEX, $r->sex), 'marital_status' => Vocab::label(Vocab::CIVIL_STATUS, $r->civil_status),
            'present_address' => $r->present_address ?? '', 'permanent_address' => $r->permanent_address ?? '',
            'indigenous' => $r->is_indigenous ? 'Yes' : 'No', 'indigenous_group' => $r->indigenous_group ?? '',
            'pwd' => $r->pwd_type !== null ? 'Yes' : 'No', 'pwd_type' => Vocab::label(Vocab::PWD_TYPE, $r->pwd_type),
            'mobile' => Mobile::display($r->mobile_no), 'email' => $r->login_email ?? $r->contact_email ?? '',
            'college' => $r->college_name ?? '', 'course' => $r->program_name ?? '', 'course_other' => $r->course_other ?? '',
            'year_graduated' => (string) $r->year_graduated,
        ];
        foreach (self::LINKS as $k) {
            $a[$k] = (string) ($links[$k] ?? '');
        }

        return $a;
    }

    /** @return array<string, mixed> */
    public function answers(int $alumniId): array
    {
        $r = DB::selectOne(self::ANSWERS_SQL.' LEFT JOIN survey_response r ON false WHERE a.alumni_id = ?', [$alumniId])
            ?? throw ApiException::notFound();

        return self::answersFromRow($r);
    }

    /**
     * PATCH /me (profile part): the registration rules minus the password, with the Admin's question edits.
     *
     * @param  array<string, mixed>  $input
     * @return list<string> the changed field ids
     */
    public function apply(int $alumniId, array $input, int $actorId): array
    {
        $before = $this->answers($alumniId);
        $a = array_merge($before, array_intersect_key($input, array_flip(self::FIELDS)));
        $errors = RegistrationRules::errors($a, null, true);
        if ($errors !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $errors);
        }
        $t = fn (string $k): ?string => is_scalar($a[$k] ?? null) && trim((string) $a[$k]) !== '' ? trim((string) $a[$k]) : null;
        $row = DB::selectOne('SELECT user_id FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$alumniId]);
        $email = (string) $t('email');
        if ($row->user_id !== null && strtolower($email) !== strtolower((string) $before['email'])) {
            if (DB::table('user_account')->whereRaw('lower(email) = lower(?)', [$email])->where('user_id', '<>', $row->user_id)->exists()) {
                throw new ApiException(409, 'That email is already used by another account.', 'email_taken', ['email' => 'That email is already used by another account.']);
            }
            DB::update('UPDATE user_account SET email = ? WHERE user_id = ?', [$email, $row->user_id]);
        }
        $program = $this->registration->resolveProgram((string) $t('college'), $t('course'), $t('course_other'));
        $married = $t('marital_status') === 'Married';
        DB::table('alumnus')->where('alumni_id', $alumniId)->update([
            'last_name' => $t('last_name'), 'first_name' => $t('first_name'), 'middle_name' => $t('middle_name'), 'suffix' => $t('suffix'),
            'married_name' => $married ? $t('married_name') : null, 'birth_date' => $t('dob'),
            'sex' => Vocab::code(Vocab::SEX, $t('gender')), 'civil_status' => Vocab::code(Vocab::CIVIL_STATUS, $t('marital_status')),
            'present_address' => $t('present_address'),
            'permanent_address' => ! empty($a['permanent_same']) ? $t('present_address') : $t('permanent_address'),
            'mobile_no' => Mobile::normalize($t('mobile')),
            'is_indigenous' => $t('indigenous') === 'Yes', 'indigenous_group' => $t('indigenous') === 'Yes' ? $t('indigenous_group') : null,
            'pwd_type' => $t('pwd') === 'Yes' ? Vocab::code(Vocab::PWD_TYPE, $t('pwd_type')) : null,
            'program_id' => $program['programId'], 'course_other' => $program['courseOther'], 'declared_college_id' => $program['declaredCollegeId'],
            'year_graduated' => (int) $t('year_graduated'), 'record_source' => 'alumni_update',
        ] + ($row->user_id === null ? ['contact_email' => $email] : []));
        if ($row->user_id !== null) {
            DB::update('UPDATE user_account SET display_name = ? WHERE user_id = ?', [trim($t('first_name').' '.$t('last_name')), $row->user_id]);
        }
        foreach (self::LINKS as $platform) {
            if (! array_key_exists($platform, $input)) {
                continue;
            }
            $url = $t($platform);
            $url === null
                ? DB::table('social_link')->where(['alumni_id' => $alumniId, 'platform' => $platform])->delete()
                : DB::table('social_link')->upsert(['alumni_id' => $alumniId, 'platform' => $platform, 'url' => $url], ['alumni_id', 'platform'], ['url']);
        }

        $after = $this->answers($alumniId);
        $changed = array_values(array_filter(array_keys($after), fn ($k) => (string) $after[$k] !== (string) ($before[$k] ?? '')));
        $diff = [];
        foreach ($changed as $k) {
            $diff[$k] = in_array($k, self::SENSITIVE, true) ? ['changed' => true] : ['from' => $before[$k] ?? '', 'to' => $after[$k]];
        }
        if ($changed !== []) {
            DB::table('record_review')->insert(['alumni_id' => $alumniId, 'reviewer_id' => $actorId, 'action' => 'edit', 'note' => 'Profile update', 'diff' => json_encode($diff)]);
        }
        $this->audit->log('profile_update', 'alumnus', $alumniId, $actorId, ['fields' => $changed]);

        return $changed;
    }

    /**
     * Privacy and directory card: opt-in, show email / mobile, per-link visibility, industry, bio.
     *
     * @param  array<string, mixed>  $p
     */
    public function applyPrivacy(int $alumniId, array $p, int $actorId): void
    {
        $set = [];
        foreach (['directoryOptIn' => 'directory_opt_in', 'showEmail' => 'show_email', 'showMobile' => 'show_mobile'] as $k => $col) {
            if (array_key_exists($k, $p)) {
                $set[$col] = self::bool($p[$k], $k);
            }
        }
        foreach (['industry' => 120, 'bio' => 1000] as $k => $max) {
            if (array_key_exists($k, $p)) {
                $v = is_scalar($p[$k]) ? trim((string) $p[$k]) : '';
                if (mb_strlen($v) > $max) {
                    throw new ApiException(422, "Keep this under {$max} characters.", 'validation', [$k => "Keep this under {$max} characters."]);
                }
                $set[$k] = $v === '' ? null : $v;
            }
        }
        if ($set !== []) {
            DB::table('alumnus')->where('alumni_id', $alumniId)->update($set);
        }
        foreach ((array) ($p['links'] ?? []) as $platform => $visible) {
            if (in_array($platform, ['facebook', 'messenger', 'twitter', 'instagram', 'linkedin', 'website'], true)) {
                DB::table('social_link')->where(['alumni_id' => $alumniId, 'platform' => $platform])->update(['is_visible' => self::bool($visible, "links.{$platform}")]);
            }
        }
        $this->audit->log('privacy_update', 'alumnus', $alumniId, $actorId, ['fields' => array_keys($p)]);
    }

    /** @param  list<mixed>  $skills  names; the first three are the "top" skills on the directory card */
    public function setSkills(int $alumniId, array $skills): void
    {
        $names = array_values(array_unique(array_filter(array_map(fn ($s) => is_scalar($s) ? trim((string) $s) : '', $skills), fn ($s) => $s !== '')));
        if (count($names) > 30 || ($names !== [] && max(array_map('mb_strlen', $names)) > 60)) {
            throw new ApiException(422, 'Use at most 30 skills of 60 characters.', 'validation', ['skills' => 'Use at most 30 skills of 60 characters.']);
        }
        DB::delete('DELETE FROM alumni_skill WHERE alumni_id = ?', [$alumniId]);
        foreach ($names as $i => $name) {
            $id = DB::selectOne('INSERT INTO skill (name) VALUES (?) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [$name])->skill_id;
            DB::insert('INSERT INTO alumni_skill (alumni_id, skill_id, is_top) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [$alumniId, $id, $i < 3]);
        }
    }

    /** @return array{photoUrl: ?string} */
    public function setPhoto(int $alumniId, ?string $key, int $actorId): array
    {
        $old = DB::transaction(function () use ($alumniId, $key, $actorId) {
            $prev = DB::selectOne('SELECT photo_url FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$alumniId])->photo_url;
            DB::update('UPDATE alumnus SET photo_url = ? WHERE alumni_id = ?', [$key, $alumniId]);
            $this->audit->log($key === null ? 'photo_remove' : 'photo_update', 'alumnus', $alumniId, $actorId);

            return $prev;
        });
        if ($old !== null && $old !== $key) {
            $this->storage->delete($old);
        }

        return ['photoUrl' => StorageService::publicUrl($key)];
    }

    private static function bool(mixed $v, string $field): bool
    {
        if (! is_bool($v)) {
            throw new ApiException(422, 'Use true or false.', 'validation', [$field => 'Use true or false.']);
        }

        return $v;
    }
}

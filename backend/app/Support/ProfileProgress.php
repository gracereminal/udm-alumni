<?php

namespace App\Support;

/**
 * completion_pct, the client's rule (client/src/lib/profileProgress.js): answered ÷ Required visible questions across
 * the profile (Personal, Contact, Education) and the survey. Program and "Others" count as one question. The Admin's
 * Alumni Tracer edits apply: hidden questions drop out, Required toggles change what counts, and added questions count
 * only when marked Required.
 */
final class ProfileProgress
{
    /** Registration-step questions shown on the profile: field id => required by default (client data/formDefs.js). */
    public const PROFILE = [
        'personal' => [
            'last_name' => true, 'first_name' => true, 'middle_name' => false, 'dob' => true, 'present_address' => true,
            'permanent_address' => true, 'gender' => true, 'marital_status' => true, 'married_name' => true,
            'indigenous' => true, 'pwd' => true, 'indigenous_group' => true, 'pwd_type' => true,
        ],
        'contact' => ['mobile' => true, 'email' => true, 'facebook' => true, 'twitter' => false, 'instagram' => false, 'linkedin' => false],
        'education' => ['college' => true, 'course' => true, 'course_other' => false, 'year_graduated' => true],
    ];

    public const CORE = ['last_name', 'first_name', 'email', 'college', 'course', 'year_graduated'];

    /**
     * @param  array<string, mixed>  $a  profile + survey answers keyed by field id
     * @param  array<string, array<string, mixed>>  $tracer  field_id => tracer_question row (section, required, shown, is_custom)
     * @return array{total: int, done: int, pct: int}
     */
    public static function compute(array $a, array $tracer = []): array
    {
        $total = $done = 0;
        $count = function (string $id, bool $answered) use (&$total, &$done) {
            $total++;
            $done += $answered ? 1 : 0;
        };

        $sections = [];
        foreach (self::PROFILE as $section => $questions) {
            $sections[$section] = $questions;
        }
        foreach (SurveyMapping::SECTIONS as $section => $questions) {
            $sections[$section] = array_fill_keys($questions, true);
        }

        foreach ($sections as $section => $questions) {
            if (! SurveyMapping::sectionVisible($section, $a)) {
                continue;
            }
            foreach ($questions as $id => $requiredByDefault) {
                if ($id === 'course_other' || ! self::visible($id, $a)) {
                    continue;
                }
                $o = $tracer[$id] ?? [];
                $core = in_array($id, self::CORE, true);
                if (! $core && ($o['shown'] ?? null) === false) {
                    continue;
                }
                $required = $core ? true : ($o['required'] ?? null) ?? $requiredByDefault;
                if ($required) {
                    $count($id, self::answered($a, $id));
                }
            }
            foreach ($tracer as $id => $o) {
                if (! empty($o['is_custom']) && ($o['section'] ?? null) === $section && ($o['shown'] ?? true) !== false && ($o['required'] ?? false) === true) {
                    $count($id, SurveyMapping::isAnswered($a, $id));
                }
            }
        }

        return ['total' => $total, 'done' => $done, 'pct' => $total ? (int) round($done / $total * 100) : 0];
    }

    /** @param  array<string, mixed>  $a */
    private static function visible(string $id, array $a): bool
    {
        return match ($id) {
            'married_name' => ($a['marital_status'] ?? null) === 'Married',
            'indigenous_group' => ($a['indigenous'] ?? null) === 'Yes',
            'pwd_type' => ($a['pwd'] ?? null) === 'Yes',
            default => SurveyMapping::questionVisible($id, $a),
        };
    }

    /** @param  array<string, mixed>  $a */
    private static function answered(array $a, string $id): bool
    {
        return match ($id) {
            'course' => SurveyMapping::isAnswered($a, 'course') || SurveyMapping::isAnswered($a, 'course_other'),
            'permanent_address' => SurveyMapping::isAnswered($a, 'permanent_address') || ! empty($a['permanent_same']),
            default => SurveyMapping::isAnswered($a, $id),
        };
    }
}

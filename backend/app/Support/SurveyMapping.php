<?php

namespace App\Support;

/**
 * The tracer survey as the client defines it (surveySectionDefs() in client/src/data/formDefs.js): field ids, the
 * "when" visibility rules, completion and the typed columns derived from the answers on submit (plan-backend
 * "Form -> column mapping"). Admin edits from tracer_question (hidden / optional questions) are applied in phase 4.
 */
final class SurveyMapping
{
    /** Section id => question ids, in form order. */
    public const SECTIONS = [
        'edu' => ['first_grad', 'udmcat', 'honors', 'prof_exams'],
        'employment' => ['ever_employed', 'unemployed_reason'],
        'details' => ['job_name', 'job_address', 'employer', 'job_status', 'org_type', 'business_line', 'occ_class',
            'place_of_work', 'time_to_job', 'job_related', 'still_working', 'stay_reasons'],
        'self' => ['se_years', 'se_nature', 'se_reason', 'se_related', 'se_other_job'],
        'feedback' => ['fb_contribute', 'fb_activity'],
    ];

    private const YN = ['Yes', 'No'];

    /**
     * Answer rules per question: ['choice', options] (one value), ['multi', options] (a list) or ['text', max length].
     * Options of choice questions can be replaced by the Admin (tracer_question.options).
     */
    public const QUESTIONS = [
        'first_grad' => ['choice', self::YN],
        'udmcat' => ['choice', self::YN],
        'honors' => ['text', 160],
        'prof_exams' => ['text', 160],
        'ever_employed' => ['choice', self::YN],
        'unemployed_reason' => ['multi', ['Advance or further study', 'Family concern and decided not to find a job', 'Health-related reason(s)', 'Lack of work experience', 'No job opportunity available', 'Did not look for a job', 'Awaiting results of a job application']],
        'job_name' => ['text', 120],
        'job_address' => ['text', 160],
        'employer' => ['text', 160],
        'job_status' => ['choice', ['Regular or Permanent', 'Temporary', 'Casual', 'Contractual', 'Self-employed']],
        'org_type' => ['choice', ['Private', 'Government', 'Non-profit / NGO', 'Self-owned business']],
        'business_line' => ['choice', ['Agriculture, forestry and fishing', 'Mining and quarrying', 'Manufacturing', 'Electricity, gas, steam and water supply', 'Construction', 'Wholesale and retail trade', 'Transportation and storage', 'Accommodation and food service activities', 'Information and communication', 'Financial and insurance activities', 'Real estate activities', 'Professional, scientific and technical activities', 'Administrative and support service activities', 'Public administration and defense', 'Education', 'Human health and social work activities', 'Arts, entertainment and recreation', 'Other service activities']],
        'occ_class' => ['choice', ['Managers', 'Professionals', 'Technicians and associate professionals', 'Clerical support workers', 'Service and sales workers', 'Skilled agricultural, forestry and fishery workers', 'Craft and related trades workers', 'Plant and machine operators and assemblers', 'Elementary occupations', 'Armed forces occupations']],
        'place_of_work' => ['choice', ['Local (within the Philippines)', 'Abroad']],
        'time_to_job' => ['choice', ['Less than a month', '1 to 6 months', '7 to 11 months', '1 year to less than 2 years', '2 years to less than 3 years', '3 years to less than 4 years', 'More than 4 years']],
        'job_related' => ['choice', self::YN],
        'still_working' => ['choice', self::YN],
        'stay_reasons' => ['multi', ['Salaries and benefits', 'Career challenge', 'Related to special skill', 'Related to course or program of study', 'Proximity to residence', 'Peer influence', 'Family influence']],
        'se_years' => ['choice', ['Less than a year', '1 year', '2 years', '3 years', '4 years', '5 years or more']],
        'se_nature' => ['text', 160],
        'se_reason' => ['multi', ['Higher income potential', 'Flexible working hours', 'Family business', 'No available employment opportunity', 'Related to my course or special skill', 'Personal passion or advocacy', 'Independence at work']],
        'se_related' => ['choice', self::YN],
        'se_other_job' => ['choice', self::YN],
        'fb_contribute' => ['text', 2000],
        'fb_activity' => ['text', 2000],
    ];

    /** Questions whose answers feed the stat columns: their options stay fixed even when the Admin edits the text. */
    public const FIXED_OPTIONS = ['ever_employed', 'unemployed_reason', 'job_status', 'org_type', 'place_of_work', 'time_to_job', 'job_related', 'still_working', 'se_related', 'first_grad', 'udmcat'];

    /**
     * Keeps known survey ids (plus the Admin's added questions) with allowed values.
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, array<string, mixed>>  $tracer  field_id => tracer_question row (options, type, is_custom)
     * @return array{0: array<string, mixed>, 1: array<string, string>} answers, errors
     */
    public static function clean(array $input, array $tracer = []): array
    {
        $rules = self::QUESTIONS;
        foreach ($tracer as $id => $q) {
            $opts = is_array($q['options'] ?? null) ? array_values(array_map('strval', $q['options'])) : null;
            if (! empty($q['is_custom'])) {
                $rules[$id] = match ($q['type'] ?? 'text') {
                    'choice', 'select' => ['choice', $opts ?? []],
                    'multi' => ['multi', $opts ?? []],
                    'textarea' => ['text', 2000],
                    default => ['text', 255],
                };
            } elseif (isset($rules[$id]) && $opts && $rules[$id][0] !== 'text' && ! in_array($id, self::FIXED_OPTIONS, true)) {
                $rules[$id][1] = $opts;
            }
        }

        $answers = [];
        $errors = [];
        foreach ($rules as $id => [$type, $rule]) {
            $v = $input[$id] ?? null;
            if ($v === null || $v === '' || $v === []) {
                continue;
            }
            if ($type === 'multi') {
                if (! is_array($v) || array_diff($v, $rule) !== []) {
                    $errors[$id] = 'Select from the listed options.';
                } else {
                    $answers[$id] = array_values(array_unique(array_map('strval', $v)));
                }
            } elseif ($type === 'choice') {
                if (! is_string($v) || ! in_array($v, $rule, true)) {
                    $errors[$id] = 'Select a valid option.';
                } else {
                    $answers[$id] = $v;
                }
            } elseif (! is_scalar($v)) {
                $errors[$id] = 'Enter text.';
            } elseif (mb_strlen($s = trim((string) $v)) > $rule) {
                $errors[$id] = "Use at most {$rule} characters.";
            } elseif ($s !== '') {
                $answers[$id] = $s;
            }
        }

        return [$answers, $errors];
    }

    /** @param  array<string, mixed>  $a */
    public static function isSelfEmployed(array $a): bool
    {
        return ($a['job_status'] ?? null) === 'Self-employed' || ($a['org_type'] ?? null) === 'Self-owned business';
    }

    /** @param  array<string, mixed>  $a */
    public static function sectionVisible(string $section, array $a): bool
    {
        return match ($section) {
            'details' => ($a['ever_employed'] ?? null) === 'Yes',
            'self' => self::isSelfEmployed($a),
            default => true,
        };
    }

    /** @param  array<string, mixed>  $a */
    public static function questionVisible(string $id, array $a): bool
    {
        return match ($id) {
            'unemployed_reason' => ($a['ever_employed'] ?? null) === 'No',
            'stay_reasons' => ($a['still_working'] ?? null) === 'Yes',
            default => true,
        };
    }

    /**
     * Visible question ids for these answers (every default survey question is Required).
     *
     * @param  array<string, mixed>  $a
     * @return list<string>
     */
    public static function visibleQuestions(array $a): array
    {
        $ids = [];
        foreach (self::SECTIONS as $section => $questions) {
            if (! self::sectionVisible($section, $a)) {
                continue;
            }
            foreach ($questions as $id) {
                if (self::questionVisible($id, $a)) {
                    $ids[] = $id;
                }
            }
        }

        return $ids;
    }

    /** @param  array<string, mixed>  $a */
    public static function isAnswered(array $a, string $id): bool
    {
        $v = $a[$id] ?? null;

        return is_array($v) ? count($v) > 0 : ($v !== null && trim((string) $v) !== '');
    }

    /**
     * Answered / Required visible survey questions, as a whole percent.
     *
     * @param  array<string, mixed>  $a
     */
    public static function completionPct(array $a): int
    {
        $visible = self::visibleQuestions($a);
        $done = count(array_filter($visible, fn (string $id) => self::isAnswered($a, $id)));

        return (int) round($done / count($visible) * 100);
    }

    /**
     * The current employment record derived from the answers (the "Employment groups" rule):
     *  ever_employed = No  -> further_studies when the reasons include further study, else not_employed;
     *  ever_employed = Yes -> not_employed when no longer working there; self_employed when job_status = Self-employed
     *                         or org_type = Self-owned business; employed otherwise.
     *
     * @param  array<string, mixed>  $a
     * @return array<string, mixed>|null column => value, or null when employment was not answered
     */
    public static function employment(array $a): ?array
    {
        $ever = $a['ever_employed'] ?? null;
        if ($ever === 'No') {
            $reasons = (array) ($a['unemployed_reason'] ?? []);

            return ['employment_status' => in_array(Vocab::FURTHER_STUDY_REASON, $reasons, true) ? 'further_studies' : 'not_employed'];
        }
        if ($ever !== 'Yes') {
            return null;
        }
        $self = self::isSelfEmployed($a);
        $bucket = Vocab::code(Vocab::TIME_TO_JOB, $a['time_to_job'] ?? null);
        $related = $self && ! empty($a['se_related']) ? $a['se_related'] : ($a['job_related'] ?? null);

        return [
            'employment_status' => ($a['still_working'] ?? null) === 'No' ? 'not_employed' : ($self ? 'self_employed' : 'employed'),
            'job_title' => self::text($a['job_name'] ?? null),
            'employer_name' => self::text($a['employer'] ?? null),
            'org_type' => Vocab::code(Vocab::ORG_TYPE, $a['org_type'] ?? null),
            'line_of_business' => self::text($a['business_line'] ?? null),
            'occupation_class' => self::text($a['occ_class'] ?? null),
            'place_of_work' => Vocab::code(Vocab::PLACE_OF_WORK, $a['place_of_work'] ?? null),
            'job_status' => Vocab::code(Vocab::JOB_STATUS, $a['job_status'] ?? null),
            'job_location' => self::text($a['job_address'] ?? null),
            'time_to_job_bucket' => $bucket,
            'months_to_first_job' => $bucket ? Vocab::TTJ_MIDPOINT[$bucket] : null,
            'course_relevance' => match ($related) {
                'Yes' => 'related',
                'No' => 'not_related',
                default => null,
            },
        ];
    }

    /**
     * honors / prof_exams -> credential rows (comma or semicolon separated; "None" means no rows).
     *
     * @param  array<string, mixed>  $a
     * @return list<array{type: string, name: string}>
     */
    public static function credentials(array $a): array
    {
        $rows = [];
        foreach (['honors' => 'honor', 'prof_exams' => 'exam'] as $field => $type) {
            foreach (preg_split('/[;,]/', (string) ($a[$field] ?? '')) ?: [] as $part) {
                $name = trim($part);
                if ($name !== '' && ! preg_match('#^(none|n/a|na|-)$#i', $name)) {
                    $rows[] = ['type' => $type, 'name' => $name];
                }
            }
        }

        return $rows;
    }

    /** @param  array<string, mixed>  $a */
    public static function yesNo(array $a, string $id): ?bool
    {
        return match ($a[$id] ?? null) {
            'Yes' => true,
            'No' => false,
            default => null,
        };
    }

    private static function text(mixed $v): ?string
    {
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}

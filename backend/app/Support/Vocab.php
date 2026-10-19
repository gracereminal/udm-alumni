<?php

namespace App\Support;

/**
 * Form labels (client/src/data/formDefs.js) <-> database enum codes, in one place so stats never compare free text.
 */
final class Vocab
{
    public const SEX = ['Male' => 'male', 'Female' => 'female', 'Prefer not to say' => 'prefer_not_to_say'];

    public const CIVIL_STATUS = ['Single' => 'single', 'Married' => 'married', 'Separated' => 'separated', 'Widowed' => 'widowed'];

    public const PWD_TYPE = [
        'Visual' => 'visual', 'Hearing' => 'hearing', 'Speech and Language' => 'speech_language',
        'Physical / Orthopedic' => 'physical', 'Intellectual' => 'intellectual', 'Learning' => 'learning',
        'Psychosocial' => 'psychosocial', 'Mental' => 'mental', 'Chronic Illness' => 'chronic_illness', 'Others' => 'others',
    ];

    public const JOB_STATUS = [
        'Regular or Permanent' => 'regular', 'Temporary' => 'temporary', 'Casual' => 'casual',
        'Contractual' => 'contractual', 'Self-employed' => 'self_employed',
    ];

    public const ORG_TYPE = ['Private' => 'private', 'Government' => 'government', 'Non-profit / NGO' => 'non_profit', 'Self-owned business' => 'self_owned'];

    public const PLACE_OF_WORK = ['Local (within the Philippines)' => 'local', 'Abroad' => 'abroad'];

    public const TIME_TO_JOB = [
        'Less than a month' => 'lt_1m', '1 to 6 months' => 'm1_6', '7 to 11 months' => 'm7_11',
        '1 year to less than 2 years' => 'y1_2', '2 years to less than 3 years' => 'y2_3',
        '3 years to less than 4 years' => 'y3_4', 'More than 4 years' => 'gt_4y',
    ];

    /** Bucket midpoints in months, used only for averages (Form A itself reports buckets). */
    public const TTJ_MIDPOINT = ['lt_1m' => 0.5, 'm1_6' => 3.5, 'm7_11' => 9, 'y1_2' => 18, 'y2_3' => 30, 'y3_4' => 42, 'gt_4y' => 54];

    public const EMPLOYMENT_TYPE = ['Full-time' => 'full_time', 'Part-time' => 'part_time', 'Contract' => 'contract', 'Internship' => 'internship', 'Freelance' => 'freelance'];

    public const EVENT_CATEGORY = ['EVENT' => 'event', 'CAREER' => 'career', 'COMMUNITY' => 'community'];

    public const NOTICE_KIND = ['Notice' => 'notice', 'Reminder' => 'reminder', 'Update' => 'update'];

    public const FURTHER_STUDY_REASON = 'Advance or further study';

    /** @param  array<string, string>  $map */
    public static function code(array $map, mixed $label): ?string
    {
        return is_string($label) && $label !== '' ? ($map[$label] ?? null) : null;
    }

    /** @param  array<string, string>  $map */
    public static function label(array $map, ?string $code): string
    {
        return $code === null ? '' : (string) (array_search($code, $map, true) ?: '');
    }
}

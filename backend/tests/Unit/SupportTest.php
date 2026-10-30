<?php

use App\Support\EntryPass;
use App\Support\Mobile;
use App\Support\SurveyMapping;
use App\Support\TfIdf;

describe('EntryPass', function () {
    it('builds the same code as entryPassCode() in the client', function () {
        // Reference values computed with client/src/lib/emailTemplates.js.
        expect(EntryPass::code('homecoming-2026', 'maria.delacruz@udmalumni.edu'))->toBe('UDM-HOME-35086')
            ->and(EntryPass::code(12, 'a@b.co'))->toBe('UDM-12XX-75169')
            ->and(EntryPass::code('ev', 'x'))->toBe('UDM-EVXX-09376');
    });
});

describe('Mobile', function () {
    it('normalizes 09 and 639 numbers to 639XXXXXXXXX', function (string $input, ?string $expected) {
        expect(Mobile::normalize($input))->toBe($expected);
    })->with([
        ['09171234567', '639171234567'],
        ['0917 123 4567', '639171234567'],
        ['639171234567', '639171234567'],
        ['+63 917 123 4567', '639171234567'],
        ['9171234567', null],
        ['0817123456', null],
    ]);
});

describe('SurveyMapping', function () {
    $employed = [
        'first_grad' => 'Yes', 'udmcat' => 'No', 'honors' => 'Cum Laude', 'prof_exams' => 'None',
        'ever_employed' => 'Yes', 'job_name' => 'Web Developer', 'job_address' => 'Manila', 'employer' => ' Acme ',
        'job_status' => 'Regular or Permanent', 'org_type' => 'Private', 'business_line' => 'Information and communication',
        'occ_class' => 'Professionals', 'place_of_work' => 'Local (within the Philippines)', 'time_to_job' => '1 to 6 months',
        'job_related' => 'Yes', 'still_working' => 'Yes', 'stay_reasons' => ['Salaries and benefits'],
        'fb_contribute' => 'Mentoring', 'fb_activity' => 'Job fair',
    ];

    it('counts only visible questions toward completion', function () use ($employed) {
        expect(SurveyMapping::completionPct($employed))->toBe(100)
            // Self-employment section appears and is unanswered: 19 of 24 visible.
            ->and(SurveyMapping::completionPct(['job_status' => 'Self-employed'] + $employed))->toBe(79)
            // "No" hides the job details and shows the unemployed reason: 8 visible, 7 answered here.
            ->and(SurveyMapping::completionPct(['ever_employed' => 'No'] + $employed))->toBe(88);
    });

    it('derives the typed employment columns', function () use ($employed) {
        expect(SurveyMapping::employment($employed))->toMatchArray([
            'employment_status' => 'employed', 'employer_name' => 'Acme', 'org_type' => 'private', 'job_status' => 'regular',
            'place_of_work' => 'local', 'time_to_job_bucket' => 'm1_6', 'months_to_first_job' => 3.5, 'course_relevance' => 'related',
        ]);
    });

    it('applies the employment groups rule', function (array $answers, ?string $status) {
        expect(SurveyMapping::employment($answers)['employment_status'] ?? null)->toBe($status);
    })->with([
        'self-employed by job status' => [['ever_employed' => 'Yes', 'job_status' => 'Self-employed'], 'self_employed'],
        'self-employed by org type' => [['ever_employed' => 'Yes', 'org_type' => 'Self-owned business'], 'self_employed'],
        'no longer working there' => [['ever_employed' => 'Yes', 'still_working' => 'No'], 'not_employed'],
        'further studies' => [['ever_employed' => 'No', 'unemployed_reason' => ['Advance or further study']], 'further_studies'],
        'not employed' => [['ever_employed' => 'No', 'unemployed_reason' => ['Lack of work experience']], 'not_employed'],
        'not answered' => [[], null],
    ]);

    it('turns honors and exams into credential rows, ignoring None', function () {
        expect(SurveyMapping::credentials(['honors' => 'Cum Laude; Best Thesis', 'prof_exams' => 'None']))->toBe([
            ['type' => 'honor', 'name' => 'Cum Laude'],
            ['type' => 'honor', 'name' => 'Best Thesis'],
        ]);
    });
});

describe('TfIdf', function () {
    it('ranks the closer document first and names the shared terms', function () {
        $docs = [
            'dev' => TfIdf::terms('Junior Software Developer. Open to graduates of IT, CS and Computer Engineering programs.'),
            'nurse' => TfIdf::terms('Staff Nurse. Provide nursing care in the medical-surgical ward.'),
            'data' => array_merge(TfIdf::terms('Data Analyst'), TfIdf::phrase('Power BI'), TfIdf::phrase('SQL')),
        ];
        $r = TfIdf::rank(array_merge(TfIdf::terms('Information Technology', 2), TfIdf::terms('IT', 2), TfIdf::phrase('SQL', 2), TfIdf::phrase('Power BI', 2)), $docs, 0.05);

        expect(array_column($r, 'key'))->toBe(['data', 'dev'])
            ->and($r[0]['terms'])->toContain('Power BI')
            ->and($r[1]['terms'])->toBe(['IT']);
    });

    it('stems word forms together and keeps acronyms apart from stop words', function () {
        $r = TfIdf::rank(TfIdf::terms('Nursing'), ['a' => TfIdf::terms('Staff nurse'), 'b' => TfIdf::terms('Engineering')]);
        expect(array_column($r, 'key'))->toBe(['a'])
            ->and(TfIdf::rank(TfIdf::terms('engineer'), ['x' => TfIdf::terms('Engineering lead')])[0]['key'])->toBe('x')
            ->and(TfIdf::terms('it is IT'))->toBe([['it', 'IT']])
            ->and(TfIdf::rank([], ['x' => TfIdf::terms('anything')]))->toBe([]);
    });
});

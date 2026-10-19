<?php

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

// Invariants on the seeded database (plan-backend "Verification"). Every screen sums the same views, so these
// equalities are what keeps the admin dashboard, college dashboard, Records and Reports in agreement.

function population(): int
{
    return DB::table('v_alumni_current')->count();
}

function grainSum(string $column = 'total', ?int $collegeId = null): int
{
    return (int) DB::table('v_stats_grain')->when($collegeId, fn ($q) => $q->where('college_id', $collegeId))->sum($column);
}

it('has a realistic seeded population', function () {
    expect(population())->toBeGreaterThan(500)
        ->and(grainSum('traced'))->toBeGreaterThan(0)
        ->and(grainSum('employed'))->toBeGreaterThan(0);
});

it('sums v_stats_grain to the population count', function () {
    expect(grainSum())->toBe(population());
});

it('agrees on the total: admin = sum of colleges = Records counters', function () {
    $byCollege = DB::table('v_stats_grain')->groupBy('college_id')->selectRaw('sum(total) AS n')->pluck('n')->sum();
    $records = (int) DB::table('v_records_counters')->selectRaw('sum(pending + flagged + verified) AS n')->value('n');

    expect((int) $byCollege)->toBe(population())
        ->and($records)->toBe(population());
});

it('keeps traced <= total and employed <= traced in every grain row', function () {
    $broken = DB::table('v_stats_grain')->whereColumn('traced', '>', 'total')->orWhereColumn('employed', '>', 'traced')->count();

    expect($broken)->toBe(0);
});

it('never has two current employment records for one alumnus', function () {
    $dupes = DB::table('employment_record')->where('is_current', true)->select('alumni_id')->groupBy('alumni_id')->havingRaw('count(*) > 1')->get()->count();

    expect($dupes)->toBe(0);

    $row = DB::table('employment_record')->where('is_current', true)->first();
    expect(fn () => DB::table('employment_record')->insert(['alumni_id' => $row->alumni_id, 'employment_status' => 'employed', 'is_current' => true]))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('leaves merged and archived alumni out of every count', function () {
    $before = population();
    $traced = DB::table('v_alumni_current')->where('traced', true)->orderBy('alumni_id')->limit(2)->pluck('alumni_id');

    DB::table('alumnus')->where('alumni_id', $traced[0])->update(['archived_at' => now()]);
    DB::table('alumnus')->where('alumni_id', $traced[1])->update(['merged_into_id' => $traced[0]]);

    expect(population())->toBe($before - 2)
        ->and(grainSum())->toBe($before - 2)
        ->and(DB::table('v_directory')->whereIn('alumni_id', $traced)->count())->toBe(0)
        ->and(DB::table('v_unresponsive')->whereIn('alumni_id', $traced)->count())->toBe(0);
});

it('counts unmapped-program alumni once, in their declared college', function () {
    $ccs = DB::table('college')->where('code', 'CCS')->value('college_id');
    $before = grainSum('total', $ccs);
    $unmapped = fn () => (int) DB::table('v_stats_grain')->where('college_id', $ccs)->whereNull('program_id')->sum('total');
    $unmappedBefore = $unmapped();

    DB::table('alumnus')->insert([
        'membership_id' => 'AM-2025-U0001', 'year_graduated' => 2025, 'last_name' => 'Unmapped', 'first_name' => 'Test',
        'course_other' => 'Bachelor of Science in Game Development', 'declared_college_id' => $ccs,
    ]);

    expect(grainSum('total', $ccs))->toBe($before + 1)
        ->and(grainSum())->toBe(population())
        ->and($unmapped())->toBe($unmappedBefore + 1);
});

it('matches each event registration count to its event_registration rows', function () {
    $rows = DB::table('event_registration')->whereNull('cancelled_at')->groupBy('event_id')->selectRaw('event_id, count(*) AS n')->pluck('n', 'event_id');

    DB::table('v_event_stats')->get()->each(fn ($e) => expect($e->registered)->toBe((int) ($rows[$e->event_id] ?? 0)));
});

it('derives every current employment record from a submitted response in the active cycle', function () {
    $employedWithoutResponse = DB::table('v_alumni_current')->where('employed', true)->whereNull('response_id')->count();

    expect($employedWithoutResponse)->toBe(0);
});

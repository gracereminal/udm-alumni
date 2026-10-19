<?php

use Illuminate\Support\Facades\DB;

it('serves the catalog, skills, cycle, targets and enums publicly', function () {
    $response = $this->getJson('/api/v1/lookups')
        ->assertOk()
        ->assertHeader('Cache-Control', 'max-age=300, public')
        ->assertJsonStructure([
            'colleges' => [['id', 'code', 'name', 'programs']],
            'skills' => [['id', 'name', 'category']],
            'cycle' => ['id', 'name', 'status'],
            'targets' => ['coverage', 'employment'],
            'enums' => ['sex', 'civilStatus', 'pwdType', 'jobStatus', 'orgType', 'placeOfWork', 'timeToJob', 'employmentType'],
        ])
        ->assertJsonPath('targets.coverage', 60)
        ->assertJsonPath('enums.sex.Female', 'female');

    $ccs = collect($response->json('colleges'))->firstWhere('code', 'CCS');
    expect($ccs['name'])->toBe('College of Computing Studies')
        ->and(collect($ccs['programs'])->pluck('abbr')->all())->toBe(['BSIT'])
        ->and(collect($response->json('colleges'))->last()['code'])->toBe('OTH')
        ->and(collect($response->json('colleges'))->sum(fn ($c) => count($c['programs'])))->toBe(DB::table('program')->where('is_active', true)->count());
});

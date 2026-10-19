<?php

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use App\Support\Scope;
use Illuminate\Support\Facades\DB;

function account(string $email): UserAccount
{
    return UserAccount::where('email', $email)->firstOrFail();
}

it('gives admin every row', function () {
    $scope = Scope::for(account('admin@udmalumni.edu'));

    expect($scope->isAll())->toBeTrue()
        ->and($scope->apply(DB::table('v_alumni_current'))->count())->toBe(DB::table('v_alumni_current')->count());
});

it('limits a dept user to their own college', function () {
    $scope = Scope::for(account('ccs.dean@udmalumni.edu'));
    $ccs = DB::table('college')->where('code', 'CCS')->value('college_id');
    $rows = $scope->apply(DB::table('v_alumni_current'))->get(['college_id']);

    expect($rows)->not->toBeEmpty()
        ->and($rows->pluck('college_id')->unique()->values()->all())->toBe([$ccs])
        ->and($rows->count())->toBe(DB::table('v_alumni_current')->where('college_id', $ccs)->count());

    $other = DB::table('v_alumni_current')->where('college_id', '<>', $ccs)->value('alumni_id');
    $own = DB::table('v_alumni_current')->where('college_id', $ccs)->value('alumni_id');
    expect($scope->allowsAlumnus($own))->toBeTrue()
        ->and($scope->allowsAlumnus($other))->toBeFalse()
        ->and($scope->allowsCollege($ccs))->toBeTrue()
        ->and(fn () => $scope->authorizeAlumnus($other))->toThrow(ApiException::class);
});

it('keeps archived records in their college scope', function () {
    $archived = DB::table('alumnus')->whereNotNull('archived_at')->first(['alumni_id']);
    $college = DB::selectOne('SELECT COALESCE(p.college_id, a.declared_college_id) AS c FROM alumnus a LEFT JOIN program p USING (program_id) WHERE a.alumni_id = ?', [$archived->alumni_id])->c;
    $dean = DB::table('user_account')->insertGetId(['email' => 'dean@example.com', 'password_hash' => 'x', 'role' => 'dept', 'college_id' => $college, 'display_name' => 'Dean'], 'user_id');

    expect(Scope::for(UserAccount::findOrFail($dean))->allowsAlumnus($archived->alumni_id))->toBeTrue();
});

it('limits an alumnus to their own record', function () {
    $maria = account('maria.delacruz@udmalumni.edu');
    $scope = Scope::for($maria);
    $own = DB::table('alumnus')->where('user_id', $maria->user_id)->value('alumni_id');

    expect($scope->apply(DB::table('v_alumni_current'))->pluck('alumni_id')->all())->toBe([$own])
        ->and($scope->allowsAlumnus($own))->toBeTrue()
        ->and($scope->allowsAlumnus($own + 1))->toBeFalse()
        ->and($scope->allowsCollege(1))->toBeFalse();
});

it('refuses a missing user', function () {
    expect(fn () => Scope::for(null))->toThrow(ApiException::class, 'Sign in to continue.');
});

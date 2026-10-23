<?php

use App\Http\Controllers\Api\V1\AlumniController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DataManagementController;
use App\Http\Controllers\Api\V1\DirectoryController;
use App\Http\Controllers\Api\V1\EventsController;
use App\Http\Controllers\Api\V1\FileController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InternalJobsController;
use App\Http\Controllers\Api\V1\JobsController;
use App\Http\Controllers\Api\V1\LookupController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\MessagesController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OutreachController;
use App\Http\Controllers\Api\V1\PasswordResetController;
use App\Http\Controllers\Api\V1\ReportsController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\StatsController;
use App\Http\Controllers\Api\V1\TracerQuestionController;
use App\Http\Controllers\Api\V1\UsersController;
use App\Http\Middleware\RequireXhr;
use Illuminate\Support\Facades\Route;

// Every route here is served under /api/v1 (bootstrap/app.php). State-changing requests need X-Requested-With
// (RequireXhr, on the api group). Route parameters named {id} are numeric.

Route::pattern('id', '[0-9]+');

Route::get('/health', HealthController::class);
Route::get('/lookups', LookupController::class);

Route::prefix('auth')->name('auth.')->group(function () {
    Route::get('/session', [AuthController::class, 'session'])->name('session');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/change-password', [AuthController::class, 'changePassword'])->middleware('auth')->name('change-password');
    Route::get('/reset-password/verify', [PasswordResetController::class, 'verify'])->name('reset.verify');

    Route::middleware('throttle:auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->name('register');
        Route::post('/login', [AuthController::class, 'login'])->name('login');
        Route::post('/mfa/verify', [AuthController::class, 'verifyMfa'])->name('mfa.verify');
        Route::post('/mfa/resend', [AuthController::class, 'resendMfa'])->name('mfa.resend');
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->name('forgot');
        Route::post('/reset-password/verify-code', [PasswordResetController::class, 'verifyCode'])->name('reset.verify-code');
        Route::post('/reset-password', [PasswordResetController::class, 'reset'])->name('reset');
    });
});

// Stored files: public ones are open; private ones need a signed link issued after a scope check.
Route::get('/files/public/{path}', [FileController::class, 'public'])->where('path', '[\w\-/.]+')->name('files.public');
Route::get('/files/private/{path}', [FileController::class, 'private'])->where('path', '[\w\-/.]+')->middleware('signed:relative')->name('files.private');

// Alumni Records (phase 3).
Route::prefix('alumni')->middleware('role:admin,dept')->group(function () {
    Route::get('/', [AlumniController::class, 'index']);
    Route::post('/', [AlumniController::class, 'store']);
    Route::get('/activity', [AlumniController::class, 'activity']);
    Route::post('/bulk-status', [AlumniController::class, 'bulkStatus']);
    Route::post('/import', [AlumniController::class, 'import']);
    Route::get('/{id}', [AlumniController::class, 'show']);
    Route::patch('/{id}', [AlumniController::class, 'update']);
    Route::post('/{id}/status', [AlumniController::class, 'status']);
    Route::post('/{id}/merge', [AlumniController::class, 'merge']);
    Route::post('/{id}/map-program', [AlumniController::class, 'mapProgram']);
    Route::post('/{id}/emails', [AlumniController::class, 'emailComposed']);
});

// The signed-in alumnus' own record (phases 3 and 4).
Route::prefix('me')->middleware('role:alumni')->group(function () {
    Route::get('/', [MeController::class, 'show']);
    Route::patch('/', [MeController::class, 'update']);
    Route::put('/survey', [MeController::class, 'survey']);
    Route::get('/export', [MeController::class, 'export'])->middleware('throttle:10,1');
    Route::post('/photo', [MeController::class, 'uploadPhoto']);
    Route::delete('/photo', [MeController::class, 'deletePhoto']);
});

// Directory (any signed-in user; masked by v_directory).
Route::prefix('directory')->middleware('role:alumni,dept,admin')->group(function () {
    Route::get('/', [DirectoryController::class, 'index']);
    Route::get('/{id}', [DirectoryController::class, 'show']);
});

// Stats and reports (phase 4). Dept users are pinned to their own college by Scope::for.
Route::prefix('stats')->middleware('role:admin,dept')->group(function () {
    Route::get('/summary', [StatsController::class, 'summary']);
    Route::get('/benchmark', [StatsController::class, 'benchmark']);
    Route::get('/by-batch', [StatsController::class, 'byBatch']);
    Route::get('/by-program', [StatsController::class, 'byProgram']);
    Route::get('/sectors', [StatsController::class, 'sectors']);
    Route::get('/inclusion', [StatsController::class, 'inclusion']);
    Route::get('/counters', [StatsController::class, 'counters']);
    Route::get('/unresponsive', [StatsController::class, 'unresponsive']);
});
Route::prefix('reports')->middleware('role:admin,dept')->group(function () {
    Route::get('/types', [ReportsController::class, 'types']);
    Route::get('/exports', [ReportsController::class, 'exports']);
    Route::post('/exports', [ReportsController::class, 'storeExport']);
    Route::get('/{type}', [ReportsController::class, 'show'])->where('type', '[a-z]+');
});

// Phase 5: tracer questions, notifications, outreach, jobs, events, announcements, users, settings, internal jobs.
Route::get('/tracer/questions', [TracerQuestionController::class, 'index']);
Route::middleware('role:admin')->group(function () {
    Route::post('/tracer/questions', [TracerQuestionController::class, 'store']);
    Route::delete('/tracer/questions', [TracerQuestionController::class, 'resetAll']);
    Route::put('/tracer/questions/{fieldId}', [TracerQuestionController::class, 'update'])->where('fieldId', '[a-z][a-z0-9_]{0,59}');
    Route::delete('/tracer/questions/{fieldId}', [TracerQuestionController::class, 'destroy'])->where('fieldId', '[a-z][a-z0-9_]{0,59}');
    Route::put('/tracer/sections/{section}/order', [TracerQuestionController::class, 'order'])->where('section', '[a-z]+');

    Route::get('/users', [UsersController::class, 'index']);
    Route::post('/users', [UsersController::class, 'store']);
    Route::patch('/users/{id}', [UsersController::class, 'update']);
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::get('/audit', [SettingsController::class, 'audit']);
});

// AI Data Management: masterlist import (upload → AI review → confirm → synced, roll back), record export, audit log.
Route::prefix('imports')->middleware('role:admin')->group(function () {
    Route::get('/', [DataManagementController::class, 'current']);
    Route::post('/', [DataManagementController::class, 'upload'])->middleware('throttle:20,1');
    Route::get('/log', [DataManagementController::class, 'log']);
    Route::get('/export', [DataManagementController::class, 'export'])->middleware('throttle:30,1');
    Route::get('/{id}', [DataManagementController::class, 'show']);
    Route::delete('/{id}', [DataManagementController::class, 'discard']);
    Route::post('/{id}/validate', [DataManagementController::class, 'validateBatch']);
    Route::post('/{id}/rows/{rowId}', [DataManagementController::class, 'decide'])->where('rowId', '[0-9]+');
    Route::post('/{id}/confirm', [DataManagementController::class, 'confirm']);
    Route::post('/{id}/rollback', [DataManagementController::class, 'rollback']);
});

Route::prefix('notifications')->middleware('role:alumni,dept,admin')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::post('/read-all', [NotificationController::class, 'readAll']);
    Route::post('/{id}/read', [NotificationController::class, 'read']);
});

Route::prefix('outreach')->middleware('role:admin,dept')->group(function () {
    Route::post('/', [OutreachController::class, 'store'])->middleware('throttle:outreach');
    Route::patch('/{id}', [OutreachController::class, 'update']);
    Route::delete('/{id}', [OutreachController::class, 'destroy']);
});

// Messages widget: one-to-one threads (alumnus <-> office, alumnus <-> their college, college staff <-> office).
Route::prefix('messages')->middleware('role:alumni,dept,admin')->group(function () {
    Route::get('/threads', [MessagesController::class, 'index']);
    Route::post('/threads', [MessagesController::class, 'open']);
    Route::get('/threads/{id}', [MessagesController::class, 'show']);
    Route::post('/threads/{id}/messages', [MessagesController::class, 'send'])->middleware('throttle:messages');
});

Route::prefix('jobs')->group(function () {
    Route::middleware('role:alumni,dept,admin')->group(function () {
        Route::get('/', [JobsController::class, 'index']);
        Route::get('/stats', [JobsController::class, 'stats']);
        Route::get('/{id}', [JobsController::class, 'show']);
    });
    Route::middleware('role:alumni,admin')->group(function () {
        Route::post('/', [JobsController::class, 'store']);
        Route::patch('/{id}', [JobsController::class, 'update']);
        Route::delete('/{id}', [JobsController::class, 'destroy']);
        Route::post('/{id}/photo', [JobsController::class, 'photo']);
    });
    Route::middleware('role:alumni')->group(function () {
        Route::post('/{id}/save', [JobsController::class, 'save']);
        Route::delete('/{id}/save', [JobsController::class, 'save']);
        Route::post('/{id}/apply', [JobsController::class, 'apply']);
        Route::delete('/{id}/apply', [JobsController::class, 'apply']);
    });
    Route::post('/{id}/{action}', [JobsController::class, 'decide'])->middleware('role:admin')->where('action', 'approve|reject|deactivate|activate|restore');
});

Route::prefix('events')->group(function () {
    Route::middleware('role:alumni,dept,admin')->group(function () {
        Route::get('/', [EventsController::class, 'index']);
        Route::get('/{id}', [EventsController::class, 'show']);
    });
    Route::middleware('role:admin')->group(function () {
        Route::post('/', [EventsController::class, 'store']);
        Route::patch('/{id}', [EventsController::class, 'update']);
        Route::delete('/{id}', [EventsController::class, 'destroy']);
        Route::post('/{id}/duplicate', [EventsController::class, 'duplicate']);
        Route::post('/{id}/photo', [EventsController::class, 'photo']);
        Route::delete('/{id}/photo', [EventsController::class, 'photo']);
        Route::post('/{id}/cancel-event', [EventsController::class, 'cancelEvent']);
        Route::get('/{id}/registrations', [EventsController::class, 'registrations']);
    });
    Route::middleware('role:alumni')->group(function () {
        Route::post('/{id}/rsvp', [EventsController::class, 'rsvp']);
        Route::post('/{id}/cancel', [EventsController::class, 'cancelRsvp']);
    });
});

Route::prefix('announcements')->group(function () {
    Route::get('/', [EventsController::class, 'announcements'])->middleware('role:alumni,dept,admin');
    Route::middleware('role:admin')->group(function () {
        Route::post('/', [EventsController::class, 'storeAnnouncement']);
        Route::patch('/{id}', [EventsController::class, 'updateAnnouncement']);
        Route::delete('/{id}', [EventsController::class, 'destroyAnnouncement']);
    });
});

// The scheduler's trigger: authenticated by X-Cron-Secret, not a session, so no X-Requested-With either.
Route::post('/internal/jobs/{name}', InternalJobsController::class)->withoutMiddleware(RequireXhr::class)->where('name', '[a-z-]+');

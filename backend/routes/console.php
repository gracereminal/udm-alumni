<?php

use Illuminate\Support\Facades\Schedule;

// Daily jobs (plan-backend "Scheduled jobs"), for hosts with a shell cron running `php artisan schedule:run` every
// minute. Hosts without one call POST /api/v1/internal/jobs/:name instead; pick one per environment, not both.
Schedule::command('app:coverage-alerts')->dailyAt('08:00')->timezone('Asia/Manila');
Schedule::command('app:notification-retention')->dailyAt('02:00')->timezone('Asia/Manila');
Schedule::command('app:token-cleanup')->dailyAt('02:30')->timezone('Asia/Manila');

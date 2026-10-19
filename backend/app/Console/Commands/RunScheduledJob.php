<?php

namespace App\Console\Commands;

use App\Services\ScheduledJobs;
use Illuminate\Console\Command;

/**
 * The daily jobs, one command each (plan-backend "Scheduled jobs"):
 *
 *   php artisan app:coverage-alerts           college users: batches below the coverage target
 *   php artisan app:notification-retention    delete read notifications after the retention window
 *   php artisan app:token-cleanup             expired password resets and sessions
 */
abstract class RunScheduledJob extends Command
{
    abstract protected function job(): string;

    public function handle(ScheduledJobs $jobs): int
    {
        $result = $jobs->run($this->job());
        $this->info($this->job().': '.json_encode($result));

        return self::SUCCESS;
    }
}

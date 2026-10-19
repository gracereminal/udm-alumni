<?php

namespace App\Console\Commands;

/** Daily: notify college users about recent batches below the coverage target. */
class CoverageAlerts extends RunScheduledJob
{
    protected $signature = 'app:coverage-alerts';

    protected $description = 'Notify college users about recent batches below the coverage target';

    protected function job(): string
    {
        return 'coverage-alerts';
    }
}

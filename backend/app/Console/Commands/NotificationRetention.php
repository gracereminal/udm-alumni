<?php

namespace App\Console\Commands;

/** Daily: delete read notifications older than the retention window. */
class NotificationRetention extends RunScheduledJob
{
    protected $signature = 'app:notification-retention';

    protected $description = 'Delete read notifications older than the retention window';

    protected function job(): string
    {
        return 'notification-retention';
    }
}

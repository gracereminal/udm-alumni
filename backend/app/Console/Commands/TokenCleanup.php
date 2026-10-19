<?php

namespace App\Console\Commands;

/** Daily: delete expired password resets and sessions. */
class TokenCleanup extends RunScheduledJob
{
    protected $signature = 'app:token-cleanup';

    protected $description = 'Delete expired password resets and sessions';

    protected function job(): string
    {
        return 'token-cleanup';
    }
}

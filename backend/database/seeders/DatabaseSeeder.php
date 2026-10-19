<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * php artisan db:seed: lookups everywhere, demo data only outside production (DemoSeeder checks the database too).
 * Production runs only: php artisan db:seed --class=LookupSeeder --force
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(LookupSeeder::class);

        if (app()->environment(['local', 'testing', 'staging'])) {
            $this->call(DemoSeeder::class);
        }
    }
}

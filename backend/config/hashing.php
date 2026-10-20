<?php

/*
 * Passwords are hashed with argon2id (plan-backend "Credentials"). The framework default is bcrypt, so the driver is
 * pinned here rather than left to HASH_DRIVER alone; the production check refuses any other driver.
 */
return [

    'driver' => env('HASH_DRIVER', 'argon2id'),

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => env('HASH_VERIFY', true),
        'limit' => env('BCRYPT_LIMIT', null),
    ],

    // verify=false lets argon2id check a hash made by another algorithm (e.g. bcrypt from before the driver was
    // pinned) with password_verify instead of throwing; login then rehashes it (AuthController::login).
    'argon' => [
        'memory' => env('ARGON_MEMORY', 65536),
        'threads' => env('ARGON_THREADS', 1),
        'time' => env('ARGON_TIME', 4),
        'verify' => env('HASH_VERIFY', false),
    ],

    'rehash_on_login' => true,

];

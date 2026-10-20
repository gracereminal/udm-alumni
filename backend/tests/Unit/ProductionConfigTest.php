<?php

use App\Providers\AppServiceProvider;

/** A complete production config (docs/deploy-notes.md, section 1.2). */
function productionConfig(array $overrides = []): void
{
    config(array_merge([
        'app.debug' => false,
        'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
        'app.url' => 'https://udm-alumni.up.railway.app',
        'database.connections.pgsql.url' => 'postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require',
        'database.connections.pgsql_direct.url' => 'postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/db?sslmode=require',
        'mail.default' => 'gmail',
        'services.google' => ['client_id' => 'id', 'client_secret' => 'secret', 'refresh_token' => 'token'],
        'filesystems.default' => 'local',
        'auth.session.secure' => true,
        'app.cron_secret' => str_repeat('c', 32),
        'hashing.driver' => 'argon2id',
    ], $overrides));
}

it('accepts the documented production config', function () {
    productionConfig();

    expect(AppServiceProvider::productionConfigProblems())->toBe([]);
});

it('names what is wrong with a production config', function (array $overrides, string $problem) {
    productionConfig($overrides);

    expect(implode('; ', AppServiceProvider::productionConfigProblems()))->toContain($problem);
})->with([
    'debug on' => [['app.debug' => true], 'APP_DEBUG'],
    'no APP_KEY' => [['app.key' => null], 'APP_KEY'],
    'http APP_URL' => [['app.url' => 'http://udm-alumni.up.railway.app'], 'APP_URL'],
    'localhost APP_URL' => [['app.url' => 'https://localhost'], 'APP_URL'],
    'no DB_URL' => [['database.connections.pgsql.url' => null], 'DB_URL is required'],
    'DB_URL_DIRECT unset' => [['database.connections.pgsql_direct.url' => 'postgresql://u:p@ep-x-pooler.ap-southeast-1.aws.neon.tech/db?sslmode=require'], 'DB_URL_DIRECT'],
    'log mailer' => [['mail.default' => 'log'], 'MAIL_MAILER=log'],
    'no Google credentials' => [['services.google' => []], 'GOOGLE_OAUTH_REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON'],
    'refresh token without client' => [['services.google' => ['refresh_token' => 'token']], 'GOOGLE_OAUTH_CLIENT_ID'],
    'service account without mailbox' => [['services.google' => ['service_account_json' => '{}']], 'GOOGLE_IMPERSONATE_USER'],
    's3 without bucket' => [['filesystems.default' => 's3', 'filesystems.disks.s3' => ['driver' => 's3', 'key' => 'k', 'secret' => 's', 'region' => 'auto']], 'AWS_BUCKET'],
    'insecure cookie' => [['auth.session.secure' => false], 'Secure'],
    'short CRON_SECRET' => [['app.cron_secret' => 'short'], 'CRON_SECRET'],
    'bcrypt hashing' => [['hashing.driver' => 'bcrypt'], 'HASH_DRIVER'],
]);

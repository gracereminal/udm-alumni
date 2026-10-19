#!/bin/sh
# Container start (see /Dockerfile): cache config, apply migrations and lookups, then serve on $PORT.
set -e

php artisan config:cache
php artisan migrate --force --database=pgsql_direct
php artisan db:seed --class=LookupSeeder --force
php artisan app:ensure-admin

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}" --no-reload

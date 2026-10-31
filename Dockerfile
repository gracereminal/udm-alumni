# Single-host image: the Laravel API (backend/) also serves the built React client (client/).
# Railway (or any Docker host) builds this from the repo root.

# 1. Client build (the email templates in /emails are imported by the client at build time)
FROM node:22-alpine AS client
WORKDIR /src
COPY client/package.json client/package-lock.json client/
RUN npm --prefix client ci
COPY client client
COPY emails emails
RUN npm --prefix client run build

# 2. PHP dependencies
FROM composer:2 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --ignore-platform-reqs

# 3. Runtime
FROM php:8.4-cli-bookworm
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql zip intl opcache pcntl
# The app is served by the CLI server (docker/start.sh), and OPcache is off for the CLI by default, so without this
# every request compiles the whole framework again. The code never changes inside a container: skip the file checks.
RUN printf '%s\n' 'opcache.enable=1' 'opcache.enable_cli=1' 'opcache.validate_timestamps=0' \
      'opcache.memory_consumption=128' 'opcache.interned_strings_buffer=16' 'opcache.max_accelerated_files=20000' \
      'realpath_cache_size=4096K' 'realpath_cache_ttl=600' > /usr/local/etc/php/conf.d/zz-performance.ini
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app
COPY backend/ ./
COPY --from=vendor /app/vendor ./vendor
# Build-time artisan runs without the real config (it comes from the host at runtime), so skip the production check.
RUN export APP_ENV=build \
    && composer dump-autoload --optimize --no-dev --no-interaction \
    && php artisan package:discover --ansi

# The built client: assets go into public/ (served as plain files), index.html is served by SpaController.
COPY --from=client /src/client/dist/ ./public/
RUN mkdir -p resources/spa && mv public/index.html resources/spa/index.html
COPY emails/ ./resources/emails/

RUN mkdir -p bootstrap/cache storage/framework/cache/data storage/framework/views storage/framework/sessions storage/logs storage/app/private \
    && chmod +x docker/start.sh

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    SPA_INDEX_PATH=/app/resources/spa/index.html \
    EMAIL_TEMPLATES_PATH=/app/resources/emails \
    SESSION_SECURE_COOKIE=true \
    CACHE_STORE=file \
    DB_PERSISTENT=true \
    PHP_CLI_SERVER_WORKERS=8 \
    PORT=8080

EXPOSE 8080
CMD ["docker/start.sh"]

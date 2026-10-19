# Single-host image: the Laravel API (backend/) also serves the built React client (client/).
# Railway (or any Docker host) builds this from the repo root. Runbook: docs/deploy-notes.md, "Single-host deploy".

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
    PHP_CLI_SERVER_WORKERS=4 \
    PORT=8080

EXPOSE 8080
CMD ["docker/start.sh"]

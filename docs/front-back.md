# Running UDM Alumni Tracer locally

Three things run during local development, each in its own terminal, in this order:

| # | Part | Folder | Command | URL |
|---|---|---|---|---|
| 1 | PostgreSQL 16 | `C:\Users\grace\pgsql16` | `pg_ctl ... start` | `localhost:5433` |
| 2 | Backend (Laravel API) | `backend/` | `php artisan serve --port=4000` | `http://localhost:4000/api/v1` |
| 3 | Frontend (React + Vite) | repo root | `npm run dev` | `http://localhost:5173` |

Vite proxies `/api` to `http://localhost:4000`, so the backend must be up before you use the frontend.

Commands below are for Git Bash. More detail is in [README.md](../README.md) and [backend/README.md](../backend/README.md).

## Requirements

- Node.js 18+ (22 LTS recommended)
- PHP 8.4 + Composer 2 (from Laravel Herd)
- PostgreSQL 16 (the portable install on port 5433, or a Neon dev branch)

## First-time setup (once)

```bash
# Herd PHP/Composer on the PATH (Git Bash)
export PATH="$HOME/.config/herd/bin/php85:$PATH"
alias composer='php ~/.config/herd/bin/composer.phar'

# Start Postgres (step 1 below), then:
cd backend
composer setup     # composer install, copy .env, APP_KEY, migrate + seed (lookups and demo data)
cd ..
npm run install:client   # installs client/ dependencies
```

Check `backend/.env`: `DB_PORT=5433`, `DB_DATABASE=udm_alumni`, `DB_USERNAME=postgres`, `MAIL_MAILER=log`
(or set `DB_URL` to use a Neon dev branch instead).

## Every time you run it

### 1. Start PostgreSQL (terminal 1)

It does not start with Windows.

```bash
PG=/c/Users/grace/pgsql16/pgsql/bin
$PG/pg_ctl.exe -D /c/Users/grace/pgsql16/data -o "-p 5433" -l /c/Users/grace/pgsql16/pg.log start
```

Stop it later with the same command, ending in `stop` instead of `start`.

### 2. Start the backend (terminal 2)

```bash
export PATH="$HOME/.config/herd/bin/php85:$PATH"
cd backend
php artisan serve --port=4000     # or: composer dev
```

### 3. Start the frontend (terminal 3)

```bash
npm run dev     # from the repo root; same as: cd client && npm run dev
```

Open `http://localhost:5173`.

## Demo accounts (password `demoPass123`)

| Role | Email |
|---|---|
| Admin | `admin@udmalumni.edu` |
| College | `ccs.dean@udmalumni.edu` |
| Alumni | `maria.delacruz@udmalumni.edu` (or Alumni ID `24-05-567`) |
| Alumni, pending | `paolo.mendoza@gmail.com` |

Password-reset codes and emails go to `backend/storage/logs/laravel.log` (because `MAIL_MAILER=log`).

## Useful extras

| Task | Command |
|---|---|
| Rebuild the dev database | `php artisan migrate:fresh --drop-views --drop-types --seed` (in `backend/`) |
| Load the 4,000-alumni dummy data | `psql -p 5433 -U postgres -d udm_alumni -v ON_ERROR_STOP=1 -f backend/dummy_data.sql` |
| Give dummy accounts passwords | run `backend/dummy_data_pass.sql` after it (local only, never commit) |
| Wipe the dummy data | run `backend/wipe_data.sql` |
| Create a staff account | `php artisan app:create-user --role=admin --email=…` (`--role=dept --college=CCS` for a college) |
| Backend tests / lint | `composer test` / `composer lint` |
| Frontend tests / lint | `npm --prefix client test` / `npm --prefix client run lint` |
| Production build + preview | `npm run build` then `npm run preview` |

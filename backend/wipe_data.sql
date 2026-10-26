-- Wipe for the UDM Alumni Tracer demo: removes everything dummy_data.sql (and dummy_data_pass.sql) adds, so it can be
-- loaded again. Production runs in demo mode with dummy data only; never run this on a database with real alumni.
--
-- HOW TO RUN: paste the whole file into the Neon SQL Editor (branch main) and Run. One transaction. The last row should
-- read: alumni 0 · alumni_accounts 0 · dummy_accounts 0 · dummy_events 0 · dummy_jobs 0
--
-- WHAT IT DELETES:
--   * Every alumni record (alumnus) and every alumni account (role = 'alumni'). Their survey responses, employment,
--     credentials, social links, skills, proofs, record history, outreach, RSVPs, saved jobs, message threads,
--     sessions and notifications go with them (ON DELETE CASCADE).
--   * Every @example.com account (the dummy admin and college accounts).
--   * Job postings submitted by alumni, the 5 dummy jobs and the 2 dummy events (matched by title).
--   * Every masterlist import batch (its rows point at the deleted records).
--
-- WHAT IT KEEPS: lookups (colleges, programs, skills, settings, survey cycle), tracer question edits, the built-in admin
-- and any other staff account not on @example.com, admin-posted jobs and events that aren't the dummy ones, and the
-- audit log.
BEGIN;

-- Alumni job submissions (posted_by would only be set to NULL)
DELETE FROM job_posting
WHERE source = 'alumni'
   OR posted_by IN (SELECT user_id FROM user_account WHERE role = 'alumni');

-- Dummy jobs and events from dummy_data.sql
DELETE FROM job_posting
WHERE (title, company) IN (
  ('Junior Software Developer', 'Accenture Philippines'),
  ('Staff Nurse', 'Ospital ng Maynila Medical Center'),
  ('Accounting Associate', 'SGV & Co.'),
  ('Customer Experience Specialist', 'Concentrix'),
  ('Part-time Instructor, Criminology', 'Universidad de Manila')
);

DELETE FROM event
WHERE title IN ('UDM Grand Alumni Homecoming 2026', 'Alumni Job Fair 2026');

-- Import batches (import_row cascades)
DELETE FROM import_batch;

-- Alumni records, then accounts. One statement for alumnus, so merged_into_id links are removed together.
DELETE FROM alumnus;

DELETE FROM user_account
WHERE role = 'alumni'
   OR lower(email) LIKE '%@example.com';

-- Check
SELECT
  (SELECT count(*) FROM alumnus) AS alumni,
  (SELECT count(*) FROM user_account WHERE role = 'alumni') AS alumni_accounts,
  (SELECT count(*) FROM user_account WHERE lower(email) LIKE '%@example.com') AS dummy_accounts,
  (SELECT count(*) FROM event WHERE title IN ('UDM Grand Alumni Homecoming 2026', 'Alumni Job Fair 2026')) AS dummy_events,
  (SELECT count(*) FROM job_posting WHERE (title, company) IN (
     ('Junior Software Developer', 'Accenture Philippines'),
     ('Staff Nurse', 'Ospital ng Maynila Medical Center'),
     ('Accounting Associate', 'SGV & Co.'),
     ('Customer Experience Specialist', 'Concentrix'),
     ('Part-time Instructor, Criminology', 'Universidad de Manila'))) AS dummy_jobs;

COMMIT;

-- Up Migration
-- Alumni Records screen support (frontend swap):
-- contact_email: an email for records without a sign-in account (e.g. registrar imports), used by outreach.
--   The sign-in email stays in USER_ACCOUNT.email and always wins when an account exists.
ALTER TABLE alumnus ADD COLUMN contact_email varchar(120);

-- Down Migration
ALTER TABLE alumnus DROP COLUMN IF EXISTS contact_email;

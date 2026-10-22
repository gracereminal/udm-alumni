-- AI Data Management (UDM Alumni.dc.html "AI Data Management"): masterlist import batches. The validator proposes,
-- the admin decides per flagged row, and nothing reaches alumnus / user_account until the batch is confirmed.
--   review      : uploaded; rows can be decided, the batch can be discarded
--   synced      : confirmed; records created / updated, accounts issued (can be rolled back until someone signs in)
--   rolled_back : the created records and accounts were removed and the updated ones restored
CREATE TYPE import_status AS ENUM ('review', 'synced', 'rolled_back');

CREATE TABLE import_batch (
  batch_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code            varchar(24) NOT NULL UNIQUE,          -- BATCH-YYYY-NNNN
  file_name       varchar(200) NOT NULL,
  columns         jsonb NOT NULL,                       -- template check: which template columns the file has
  status          import_status NOT NULL DEFAULT 'review',
  created_by      bigint REFERENCES user_account ON DELETE SET NULL,
  validated_at    timestamptz,
  confirmed_by    bigint REFERENCES user_account ON DELETE SET NULL,
  confirmed_at    timestamptz,
  rolled_back_at  timestamptz,
  result          jsonb,                                -- counts written at confirm
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX import_batch_recent_idx ON import_batch (created_at DESC);

CREATE TABLE import_row (
  row_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id   bigint NOT NULL REFERENCES import_batch ON DELETE CASCADE,
  row_no     integer NOT NULL,                          -- line in the file (header = 1)
  source     jsonb NOT NULL,                            -- the cells as uploaded: student_no, name, college, program, year, email, mobile
  edits      jsonb NOT NULL DEFAULT '{}',               -- the admin's overrides (accepted suggestion or manual edit), same keys
  decision   varchar(10) CHECK (decision IN ('accept', 'edit', 'keep', 'reject')),
  outcome    jsonb,                                     -- frozen at confirm: kind, membership ID, changed fields
  alumni_id  bigint REFERENCES alumnus ON DELETE SET NULL,       -- the record created or updated
  user_id    bigint REFERENCES user_account ON DELETE SET NULL,  -- the account created
  before     jsonb,                                     -- update rows: the replaced values, for roll back
  UNIQUE (batch_id, row_no)
);

-- Temporary passwords issued by an import stop working after 7 days (Forgot password still works).
ALTER TABLE user_account ADD COLUMN temp_password_expires_at timestamptz;

CREATE TRIGGER import_batch_updated_at BEFORE UPDATE ON import_batch FOR EACH ROW EXECUTE FUNCTION set_updated_at();

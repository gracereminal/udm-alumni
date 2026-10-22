-- In-portal Messages (UDM Alumni.dc.html `msgw`). One-to-one only; alumni never message each other.
--   office  : an alumnus <-> the Alumni Relations Office (any admin answers)
--   college : an alumnus <-> their college's staff (dept users of the alumnus' college)
--   admin   : a college staff account <-> the Alumni Relations Office
CREATE TYPE message_channel AS ENUM ('office', 'college', 'admin');

CREATE TABLE message_thread (
  thread_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel          message_channel NOT NULL,
  alumni_id        bigint REFERENCES alumnus ON DELETE CASCADE,       -- office / college threads
  staff_user_id    bigint REFERENCES user_account ON DELETE CASCADE,  -- admin threads: the college staff account
  last_message_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_thread_party CHECK (
    (channel = 'admin' AND staff_user_id IS NOT NULL AND alumni_id IS NULL)
    OR (channel <> 'admin' AND alumni_id IS NOT NULL AND staff_user_id IS NULL)
  )
);
CREATE UNIQUE INDEX message_thread_alumni_uk ON message_thread (channel, alumni_id) WHERE alumni_id IS NOT NULL;
CREATE UNIQUE INDEX message_thread_staff_uk ON message_thread (staff_user_id) WHERE channel = 'admin';
CREATE INDEX message_thread_recent_idx ON message_thread (channel, last_message_at DESC);

CREATE TABLE message (
  message_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id    bigint NOT NULL REFERENCES message_thread ON DELETE CASCADE,
  sender_id    bigint REFERENCES user_account ON DELETE SET NULL,
  sender_role  user_role NOT NULL,                     -- which side wrote it, kept if the account is removed
  body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX message_thread_idx ON message (thread_id, created_at);

-- Per-user read mark: messages from the other side after last_read_id are unread for that user.
CREATE TABLE message_read (
  thread_id  bigint NOT NULL REFERENCES message_thread ON DELETE CASCADE,
  user_id    bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  last_read_id  bigint NOT NULL DEFAULT 0,             -- the newest message_id the user has seen
  read_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TRIGGER message_thread_updated_at BEFORE UPDATE ON message_thread FOR EACH ROW EXECUTE FUNCTION set_updated_at();

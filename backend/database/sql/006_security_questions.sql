-- Security questions for two-step verification (UDM Alumni.dc.html "MFA Verification", "Security questions" tab):
-- the second sign-in step accepts either the emailed code or the answers to two questions the user chose. Answers are
-- stored only as argon2id hashes of the trimmed, lower-cased text, so they are not case-sensitive.
CREATE TABLE security_answer (
  user_id      bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  slot         smallint NOT NULL CHECK (slot IN (1, 2)),
  question     varchar(120) NOT NULL,
  answer_hash  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

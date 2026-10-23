-- Two-step verification at sign-in (UDM Alumni.dc.html "MFA Verification"): after the password, a 6-digit code is
-- emailed and must be entered before a session is created. Both the challenge token (held by the browser between the
-- two steps) and the code are stored only as hashes.
CREATE TABLE login_challenge (
  challenge_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  token_hash    char(64) NOT NULL UNIQUE,               -- SHA-256 (hex) of the challenge token
  code_hash     char(64) NOT NULL,                      -- SHA-256 of "token_hash:code"
  sent_to       varchar(120) NOT NULL,
  attempts      smallint NOT NULL DEFAULT 0,
  resends       smallint NOT NULL DEFAULT 0,
  last_sent_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_challenge_user_idx ON login_challenge (user_id, created_at DESC);

-- "Trust this device for 30 days": the browser holds a random token (udm_tdev cookie); only its hash is stored.
-- Password changes and resets revoke every trusted device of the account.
CREATE TABLE trusted_device (
  device_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  token_hash  char(64) NOT NULL UNIQUE,
  user_agent  varchar(255),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz
);
CREATE INDEX trusted_device_user_idx ON trusted_device (user_id) WHERE revoked_at IS NULL;

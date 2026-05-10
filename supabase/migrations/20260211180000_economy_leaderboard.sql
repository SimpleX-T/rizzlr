-- Premium unlocks, treasury ledger (daily pot), game session timer fields, daily pot snapshots.

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS user_budget_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS user_seconds_used INTEGER;

CREATE TABLE IF NOT EXISTS treasury_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  wallet_address TEXT NOT NULL,
  amount_lamports BIGINT NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN ('premium_unlock', 'time_extension', 'wager_rake')
  ),
  tx_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_ledger_created ON treasury_ledger (created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_source ON treasury_ledger (source);

CREATE TABLE IF NOT EXISTS persona_unlocks (
  wallet_address TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  tx_signature TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_address, persona_id)
);

CREATE TABLE IF NOT EXISTS daily_pot_snapshots (
  pot_date DATE NOT NULL PRIMARY KEY,
  total_lamports BIGINT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS daily_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  pot_date DATE NOT NULL REFERENCES daily_pot_snapshots (pot_date) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  rank INTEGER NOT NULL,
  composite_score NUMERIC NOT NULL,
  share_bps INTEGER NOT NULL,
  payout_lamports BIGINT NOT NULL,
  UNIQUE (pot_date, rank),
  UNIQUE (pot_date, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_daily_lb_pot_date ON daily_leaderboard_snapshots (pot_date);

CREATE TABLE IF NOT EXISTS daily_pot_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  pot_date DATE NOT NULL,
  wallet_address TEXT NOT NULL,
  lamports BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  tx_signature TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pot_date, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_daily_payouts_date ON daily_pot_payouts (pot_date);

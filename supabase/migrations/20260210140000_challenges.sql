-- PvP challenges + on-chain tx audit trail.

CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  creator_wallet TEXT NOT NULL,
  challenger_wallet TEXT,
  persona_id TEXT NOT NULL,
  session_seed TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL,
  creator_score INTEGER NOT NULL,
  challenger_score INTEGER,
  wager_type TEXT NOT NULL DEFAULT 'free' CHECK (wager_type IN ('free', 'sol_escrow')),
  wager_lamports BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN (
      'open',
      'accepted',
      'challenger_played',
      'settled',
      'expired',
      'cancelled'
    )
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  source_game_session_id UUID REFERENCES game_sessions (id) ON DELETE SET NULL,
  winner_wallet TEXT,
  escrow_pda TEXT,
  escrow_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_creator ON challenges (creator_wallet);
CREATE INDEX idx_challenges_status_expires ON challenges (status, expires_at);

CREATE TABLE challenge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  challenge_id UUID NOT NULL REFERENCES challenges (id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenge_transactions_challenge ON challenge_transactions (challenge_id);

CREATE OR REPLACE FUNCTION set_challenges_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenges_updated_at
BEFORE UPDATE ON challenges
FOR EACH ROW
EXECUTE FUNCTION set_challenges_updated_at ();

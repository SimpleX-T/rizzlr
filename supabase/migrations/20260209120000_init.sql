-- Core tables for profiles, game history, Hall of Shame, and wallet auth nonces.

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_wallet ON users (wallet_address);

CREATE TABLE auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_nonces_expires ON auth_nonces (expires_at);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  won BOOLEAN NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  exit_line TEXT,
  messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_sessions_user_ended ON game_sessions (user_id, ended_at DESC);

CREATE TABLE roast_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_session_id UUID REFERENCES game_sessions (id) ON DELETE SET NULL,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  persona_id TEXT NOT NULL,
  exit_line TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roast_entries_persona_exit_unique UNIQUE (persona_id, exit_line)
);

CREATE INDEX idx_roast_entries_created ON roast_entries (created_at DESC);
CREATE INDEX idx_roast_entries_likes ON roast_entries (like_count DESC);

CREATE TABLE roast_likes (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  roast_id UUID NOT NULL REFERENCES roast_entries (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, roast_id)
);

CREATE OR REPLACE FUNCTION bump_roast_like_count ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE roast_entries
    SET like_count = like_count + 1
    WHERE id = NEW.roast_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE roast_entries
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.roast_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER roast_likes_ai
AFTER INSERT ON roast_likes
FOR EACH ROW
EXECUTE FUNCTION bump_roast_like_count ();

CREATE TRIGGER roast_likes_ad
AFTER DELETE ON roast_likes
FOR EACH ROW
EXECUTE FUNCTION bump_roast_like_count ();

CREATE OR REPLACE FUNCTION set_users_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_updated_at ();

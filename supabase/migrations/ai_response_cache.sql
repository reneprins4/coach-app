-- AI Response Cache
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_response_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Unique index: per-user cache keys
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_user_key ON ai_response_cache(cache_key, user_id)
  WHERE user_id IS NOT NULL;

-- Unique index: global cache keys (substitutes — no user_id)
CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_global_key ON ai_response_cache(cache_key)
  WHERE user_id IS NULL;

-- Index for expiry cleanup
CREATE INDEX IF NOT EXISTS ai_cache_expires ON ai_response_cache(expires_at);

-- RLS
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own or global cache" ON ai_response_cache
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "insert own cache" ON ai_response_cache
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "upsert own cache" ON ai_response_cache
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "delete own cache" ON ai_response_cache
  FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

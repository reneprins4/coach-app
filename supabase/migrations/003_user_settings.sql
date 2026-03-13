CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

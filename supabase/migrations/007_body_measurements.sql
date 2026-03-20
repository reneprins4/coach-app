-- Body measurements table for tracking weight, waist, chest, arms, hips, thighs
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weight', 'waist', 'chest', 'arms', 'hips', 'thighs')),
  value NUMERIC NOT NULL CHECK (value > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_measurements_user_date ON body_measurements(user_id, date DESC);
CREATE INDEX idx_measurements_user_type ON body_measurements(user_id, type, date DESC);

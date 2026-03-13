-- Add user_id to workouts and sets
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE sets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users see own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own sets" ON sets FOR ALL USING (auth.uid() = user_id);

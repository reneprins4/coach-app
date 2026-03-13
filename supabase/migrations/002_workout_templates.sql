CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  ai_summary text,
  noah_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, session_date)
);

ALTER TABLE session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own summaries" ON session_summaries
  FOR ALL USING (auth.uid() = user_id);

-- Admins (role = admin in client_profiles) can read all summaries
CREATE POLICY "Admins read all summaries" ON session_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_profiles
      WHERE client_profiles.user_id = auth.uid()
        AND client_profiles.role = 'admin'
    )
  );

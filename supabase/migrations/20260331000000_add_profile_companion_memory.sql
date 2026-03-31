-- Drop companion memory columns from profiles (replaced by profile_traits)
ALTER TABLE profiles
DROP COLUMN IF EXISTS life_compass,
DROP COLUMN IF EXISTS current_season,
DROP COLUMN IF EXISTS core_values,
DROP COLUMN IF EXISTS support_preferences,
DROP COLUMN IF EXISTS reflection_focus,
DROP COLUMN IF EXISTS anti_patterns;

-- Create profile_traits table (free-form key-value)
CREATE TABLE profile_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_traits_user ON profile_traits(user_id, sort_order);

-- RLS
ALTER TABLE profile_traits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_traits_select_own"
  ON profile_traits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profile_traits_insert_own"
  ON profile_traits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_traits_update_own"
  ON profile_traits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "profile_traits_delete_own"
  ON profile_traits FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER set_profile_traits_updated_at
  BEFORE UPDATE ON profile_traits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

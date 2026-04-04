-- Add history column to profile_traits for tracking value changes
ALTER TABLE profile_traits
ADD COLUMN history jsonb DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN profile_traits.history IS 'Array of {value, changed_at} entries tracking previous values';

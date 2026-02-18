-- Simplify time_slot enum from 7 values to 5 values
-- Old: early_morning, morning, late_morning, afternoon, evening, night, anytime
-- New: dawn (0-6), morning (6-12), afternoon (12-18), evening (18-24), anytime

-- 1. Drop default before altering type
ALTER TABLE public.tasks ALTER COLUMN time_slot DROP DEFAULT;

-- 2. Convert column to TEXT so we can update values freely
ALTER TABLE public.tasks
  ALTER COLUMN time_slot TYPE TEXT USING time_slot::text;

-- 3. Map existing data to new slot names
UPDATE public.tasks
SET time_slot = CASE
  WHEN time_slot = 'early_morning' THEN 'dawn'
  WHEN time_slot IN ('morning', 'late_morning') THEN 'morning'
  WHEN time_slot = 'afternoon' THEN 'afternoon'
  WHEN time_slot IN ('evening', 'night') THEN 'evening'
  WHEN time_slot = 'anytime' THEN 'anytime'
  ELSE 'anytime'
END;

-- 4. Drop old enum
DROP TYPE IF EXISTS time_slot;

-- 5. Create new enum with 5 values
CREATE TYPE time_slot AS ENUM ('dawn', 'morning', 'afternoon', 'evening', 'anytime');

-- 6. Alter column to use new enum
ALTER TABLE public.tasks
  ALTER COLUMN time_slot TYPE time_slot USING time_slot::time_slot;

-- 7. Restore default value
ALTER TABLE public.tasks
  ALTER COLUMN time_slot SET DEFAULT 'anytime'::time_slot;

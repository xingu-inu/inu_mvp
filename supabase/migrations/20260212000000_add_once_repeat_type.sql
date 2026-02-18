-- ============================================
-- Add 'once' to repeat_type enum for one-off tasks
-- ============================================

ALTER TYPE repeat_type ADD VALUE IF NOT EXISTS 'once';

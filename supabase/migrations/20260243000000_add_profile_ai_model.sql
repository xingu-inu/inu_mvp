-- Add ai_model column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_model text DEFAULT NULL;

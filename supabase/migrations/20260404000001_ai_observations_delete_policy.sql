-- Add missing DELETE RLS policy for ai_observations
create policy "Users can delete own observations"
  on ai_observations for delete using (auth.uid() = user_id);

-- Add length constraints to timeline_notes for defense-in-depth
alter table timeline_notes
  add constraint timeline_notes_content_length check (length(content) <= 500),
  add constraint timeline_notes_observation_key_length check (length(observation_key) <= 200);

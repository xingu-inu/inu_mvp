-- Add auto_sync column to google_calendar_connections
ALTER TABLE google_calendar_connections
ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN NOT NULL DEFAULT false;

-- Comment
COMMENT ON COLUMN google_calendar_connections.auto_sync IS 'Auto-export task changes to Google Calendar on create/update/delete';

-- Scheduled Tasks Table
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cron_expression TEXT NOT NULL, -- e.g., "0 9 * * *" = every day at 9am
  toolkits TEXT[] DEFAULT '{}', -- array of toolkit slugs to use
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Task Logs Table
CREATE TABLE IF NOT EXISTS scheduled_task_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_task_logs ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_tasks
CREATE POLICY "Users can view their own scheduled tasks"
  ON scheduled_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled tasks"
  ON scheduled_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled tasks"
  ON scheduled_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled tasks"
  ON scheduled_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for scheduled_task_logs
CREATE POLICY "Users can view logs of their own tasks"
  ON scheduled_task_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scheduled_tasks 
      WHERE scheduled_tasks.id = scheduled_task_logs.task_id 
      AND scheduled_tasks.user_id = auth.uid()
    )
  );

-- Index for faster queries
CREATE INDEX idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_task_logs_task_id ON scheduled_task_logs(task_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_tasks_updated_at
  BEFORE UPDATE ON scheduled_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

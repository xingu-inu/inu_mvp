-- Add context columns to chat_conversations for linking to goals/tasks
ALTER TABLE public.chat_conversations
  ADD COLUMN related_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  ADD COLUMN related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_chat_conversations_goal
  ON public.chat_conversations(related_goal_id) WHERE related_goal_id IS NOT NULL;
CREATE INDEX idx_chat_conversations_task
  ON public.chat_conversations(related_task_id) WHERE related_task_id IS NOT NULL;

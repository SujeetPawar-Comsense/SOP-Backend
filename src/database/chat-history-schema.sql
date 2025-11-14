-- Create chat_history table for storing AI assistance conversations
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL,
  user_id uuid,
  user_role text NOT NULL CHECK (user_role IN ('project_owner', 'vibe_engineer', 'developer')),
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  context jsonb,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT chat_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_history_project_id ON public.chat_history(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON public.chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_role ON public.chat_history(user_role);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at DESC);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_chat_history_project_role_created 
  ON public.chat_history(project_id, user_role, created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chat history
CREATE POLICY "Users can view own chat history" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own chat messages
CREATE POLICY "Users can insert own chat messages" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chat messages
CREATE POLICY "Users can update own chat messages" ON public.chat_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Project members can view project chat history
CREATE POLICY "Project members can view project chats" ON public.chat_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = chat_history.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_chat_history_updated_at
  BEFORE UPDATE ON public.chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.chat_history TO authenticated;
GRANT USAGE ON SEQUENCE chat_history_id_seq TO authenticated;

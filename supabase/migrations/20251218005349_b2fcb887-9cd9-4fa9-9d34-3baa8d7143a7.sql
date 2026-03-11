-- Create table for support chat conversations
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

-- Users can view their own chats
CREATE POLICY "Users can view their own support chats"
  ON public.support_chats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own chats
CREATE POLICY "Users can create their own support chats"
  ON public.support_chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own chats
CREATE POLICY "Users can update their own support chats"
  ON public.support_chats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all chats
CREATE POLICY "Admins can view all support chats"
  ON public.support_chats
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_support_chats_updated_at
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
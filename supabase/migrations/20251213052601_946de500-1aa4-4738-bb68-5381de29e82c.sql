
-- Create table to track service trials per user
CREATE TABLE public.service_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_key TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_key)
);

-- Enable RLS
ALTER TABLE public.service_trials ENABLE ROW LEVEL SECURITY;

-- Users can view their own trials
CREATE POLICY "Users can view their own trials" 
ON public.service_trials 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own trials
CREATE POLICY "Users can insert their own trials" 
ON public.service_trials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_service_trials_user_service ON public.service_trials(user_id, service_key);

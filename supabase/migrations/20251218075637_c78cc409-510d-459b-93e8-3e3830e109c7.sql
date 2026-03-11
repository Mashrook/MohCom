-- Create table to track failed login attempts
CREATE TABLE public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_failed_login_email_time ON public.failed_login_attempts(email, attempt_time DESC);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can view
CREATE POLICY "Only admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert failed attempts (no auth required for logging)
CREATE POLICY "System can insert failed login attempts"
ON public.failed_login_attempts
FOR INSERT
WITH CHECK (true);

-- No one can update or delete
CREATE POLICY "No one can update failed login attempts"
ON public.failed_login_attempts
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete failed login attempts"
ON public.failed_login_attempts
FOR DELETE
USING (false);

-- Function to check if user is rate limited
CREATE OR REPLACE FUNCTION public.is_login_rate_limited(p_email TEXT, p_window_minutes INTEGER DEFAULT 15, p_max_attempts INTEGER DEFAULT 5)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= p_max_attempts
  FROM public.failed_login_attempts
  WHERE email = LOWER(p_email)
    AND attempt_time > (now() - (p_window_minutes || ' minutes')::interval)
$$;

-- Function to get remaining lockout time
CREATE OR REPLACE FUNCTION public.get_lockout_remaining_seconds(p_email TEXT, p_window_minutes INTEGER DEFAULT 15, p_max_attempts INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, 
    EXTRACT(EPOCH FROM (
      (SELECT MIN(attempt_time) FROM (
        SELECT attempt_time 
        FROM public.failed_login_attempts
        WHERE email = LOWER(p_email)
          AND attempt_time > (now() - (p_window_minutes || ' minutes')::interval)
        ORDER BY attempt_time DESC
        LIMIT p_max_attempts
      ) recent_attempts) + (p_window_minutes || ' minutes')::interval - now()
    ))
  )::INTEGER
$$;

-- Function to record failed attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT, p_ip_address TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent)
  VALUES (LOWER(p_email), p_ip_address, p_user_agent);
END;
$$;

-- Function to clear failed attempts after successful login
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE email = LOWER(p_email);
END;
$$;
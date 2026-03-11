
-- Add session timeout setting
INSERT INTO public.admin_security_settings (setting_key, setting_value)
VALUES ('session_timeout_enabled', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Add timeout duration in minutes (default 30 minutes)
ALTER TABLE public.admin_security_settings 
ADD COLUMN IF NOT EXISTS setting_value_int INTEGER DEFAULT NULL;

UPDATE public.admin_security_settings 
SET setting_value_int = 30 
WHERE setting_key = 'session_timeout_enabled';

-- Create function to automatically end inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_admin_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  timeout_enabled BOOLEAN;
  timeout_minutes INTEGER;
  ended_count INTEGER;
BEGIN
  -- Check if session timeout is enabled
  SELECT setting_value, COALESCE(setting_value_int, 30)
  INTO timeout_enabled, timeout_minutes
  FROM public.admin_security_settings
  WHERE setting_key = 'session_timeout_enabled';
  
  -- If not enabled, return 0
  IF timeout_enabled IS NULL OR timeout_enabled = false THEN
    RETURN 0;
  END IF;
  
  -- End all sessions that have been inactive for longer than the timeout
  UPDATE public.admin_sessions
  SET 
    is_active = false,
    ended_at = now(),
    end_reason = 'auto_timeout'
  WHERE is_active = true
    AND last_activity < (now() - (timeout_minutes || ' minutes')::interval);
  
  GET DIAGNOSTICS ended_count = ROW_COUNT;
  
  RETURN ended_count;
END;
$$;

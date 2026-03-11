-- Create admin sessions tracking table
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  session_token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ended_by UUID,
  end_reason TEXT
);

-- Enable RLS
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own sessions or all sessions
CREATE POLICY "Admins can view all admin sessions"
ON public.admin_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert their own sessions
CREATE POLICY "Admins can insert their own sessions"
ON public.admin_sessions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

-- Only admins can update sessions (for ending them)
CREATE POLICY "Admins can update admin sessions"
ON public.admin_sessions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- No one can delete sessions (audit trail)
CREATE POLICY "No one can delete admin sessions"
ON public.admin_sessions
FOR DELETE
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
CREATE INDEX idx_admin_sessions_is_active ON public.admin_sessions(is_active);
CREATE INDEX idx_admin_sessions_session_token ON public.admin_sessions(session_token);

-- Function to parse user agent into device info
CREATE OR REPLACE FUNCTION public.parse_device_info(user_agent_str TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  device_info JSONB;
  browser TEXT := 'Unknown';
  os TEXT := 'Unknown';
  device_type TEXT := 'Desktop';
BEGIN
  -- Detect browser
  IF user_agent_str ILIKE '%Chrome%' AND user_agent_str NOT ILIKE '%Edg%' THEN
    browser := 'Chrome';
  ELSIF user_agent_str ILIKE '%Firefox%' THEN
    browser := 'Firefox';
  ELSIF user_agent_str ILIKE '%Safari%' AND user_agent_str NOT ILIKE '%Chrome%' THEN
    browser := 'Safari';
  ELSIF user_agent_str ILIKE '%Edg%' THEN
    browser := 'Edge';
  ELSIF user_agent_str ILIKE '%Opera%' OR user_agent_str ILIKE '%OPR%' THEN
    browser := 'Opera';
  END IF;
  
  -- Detect OS
  IF user_agent_str ILIKE '%Windows%' THEN
    os := 'Windows';
  ELSIF user_agent_str ILIKE '%Mac OS%' OR user_agent_str ILIKE '%Macintosh%' THEN
    os := 'macOS';
  ELSIF user_agent_str ILIKE '%Linux%' AND user_agent_str NOT ILIKE '%Android%' THEN
    os := 'Linux';
  ELSIF user_agent_str ILIKE '%Android%' THEN
    os := 'Android';
    device_type := 'Mobile';
  ELSIF user_agent_str ILIKE '%iPhone%' OR user_agent_str ILIKE '%iPad%' THEN
    os := 'iOS';
    device_type := CASE WHEN user_agent_str ILIKE '%iPad%' THEN 'Tablet' ELSE 'Mobile' END;
  END IF;
  
  device_info := jsonb_build_object(
    'browser', browser,
    'os', os,
    'device_type', device_type,
    'raw_user_agent', LEFT(user_agent_str, 500)
  );
  
  RETURN device_info;
END;
$$;

-- Function to register admin session
CREATE OR REPLACE FUNCTION public.register_admin_session(
  p_session_token TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id UUID;
  v_device_info JSONB;
BEGIN
  -- Only allow admins
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can register sessions';
  END IF;
  
  -- Parse device info
  v_device_info := parse_device_info(COALESCE(p_user_agent, ''));
  
  -- Insert session
  INSERT INTO public.admin_sessions (
    admin_id,
    session_token,
    device_info,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_session_token,
    v_device_info,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;

-- Function to update session activity
CREATE OR REPLACE FUNCTION public.update_admin_session_activity(p_session_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.admin_sessions
  SET last_activity = now()
  WHERE session_token = p_session_token
    AND admin_id = auth.uid()
    AND is_active = true;
END;
$$;

-- Function to end admin session
CREATE OR REPLACE FUNCTION public.end_admin_session(
  p_session_id UUID,
  p_reason TEXT DEFAULT 'manual_logout'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can end sessions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can end sessions';
  END IF;
  
  UPDATE public.admin_sessions
  SET 
    is_active = false,
    ended_at = now(),
    ended_by = auth.uid(),
    end_reason = p_reason
  WHERE id = p_session_id
    AND is_active = true;
  
  RETURN FOUND;
END;
$$;
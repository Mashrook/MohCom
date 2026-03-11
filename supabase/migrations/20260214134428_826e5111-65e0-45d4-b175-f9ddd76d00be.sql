
-- Table to log policy violations and suspicious SELECT access attempts
CREATE TABLE public.policy_violation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  attempted_table TEXT NOT NULL,
  attempted_action TEXT NOT NULL DEFAULT 'SELECT',
  violation_type TEXT NOT NULL, -- 'rls_denied', 'unauthorized_access', 'suspicious_query', 'data_masking_bypass'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policy_violation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read violation logs
CREATE POLICY "admins_read_violations"
ON public.policy_violation_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only system (service_role) or admins can insert
CREATE POLICY "system_insert_violations"
ON public.policy_violation_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- No updates or deletes - immutable audit log
CREATE POLICY "no_update_violations"
ON public.policy_violation_logs FOR UPDATE
USING (false);

CREATE POLICY "no_delete_violations"
ON public.policy_violation_logs FOR DELETE
USING (false);

-- Index for efficient querying
CREATE INDEX idx_violation_logs_created_at ON public.policy_violation_logs (created_at DESC);
CREATE INDEX idx_violation_logs_severity ON public.policy_violation_logs (severity);
CREATE INDEX idx_violation_logs_table ON public.policy_violation_logs (attempted_table);

-- Function to log policy violations (callable from edge functions and client)
CREATE OR REPLACE FUNCTION public.log_policy_violation(
  p_attempted_table TEXT,
  p_attempted_action TEXT DEFAULT 'SELECT',
  p_violation_type TEXT DEFAULT 'unauthorized_access',
  p_severity TEXT DEFAULT 'medium',
  p_description TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_blocked BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.policy_violation_logs (
    user_id, attempted_table, attempted_action, violation_type,
    severity, description, ip_address, user_agent, blocked
  ) VALUES (
    auth.uid(), p_attempted_table, p_attempted_action, p_violation_type,
    p_severity, p_description, p_ip_address, p_user_agent, p_blocked
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Add comment
COMMENT ON TABLE public.policy_violation_logs IS 'Immutable audit log for RLS policy violations and unauthorized SELECT access attempts. Admin read-only.';

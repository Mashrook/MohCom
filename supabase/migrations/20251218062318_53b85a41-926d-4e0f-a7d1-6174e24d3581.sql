-- Create table for password security logs (rejected attempts)
CREATE TABLE public.password_security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  rejection_reason TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view password security logs
CREATE POLICY "Only admins can view password security logs"
ON public.password_security_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert logs (no auth required for failed attempts)
CREATE POLICY "System can insert password security logs"
ON public.password_security_logs
FOR INSERT
WITH CHECK (true);

-- No one can update or delete logs
CREATE POLICY "No one can update password security logs"
ON public.password_security_logs
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete password security logs"
ON public.password_security_logs
FOR DELETE
USING (false);

-- Index for faster queries
CREATE INDEX idx_password_security_logs_created_at ON public.password_security_logs(created_at DESC);
CREATE INDEX idx_password_security_logs_email ON public.password_security_logs(email);
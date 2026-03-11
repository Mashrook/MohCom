-- Create blocked IPs table
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id),
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER DEFAULT 0,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on active blocked IPs
CREATE UNIQUE INDEX blocked_ips_active_ip_idx ON public.blocked_ips (ip_address) WHERE unblocked_at IS NULL;

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked IPs
CREATE POLICY "Only admins can view blocked IPs"
ON public.blocked_ips FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert blocked IPs
CREATE POLICY "Only admins can insert blocked IPs"
ON public.blocked_ips FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR current_setting('role', true) = 'service_role');

-- Only admins can update blocked IPs
CREATE POLICY "Only admins can update blocked IPs"
ON public.blocked_ips FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete blocked IPs
CREATE POLICY "Only admins can delete blocked IPs"
ON public.blocked_ips FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = check_ip
    AND unblocked_at IS NULL
    AND (is_permanent = true OR blocked_until > now())
  );
END;
$$;

-- Function to auto-block IP
CREATE OR REPLACE FUNCTION public.auto_block_ip(
  p_ip_address TEXT,
  p_reason TEXT,
  p_attempt_count INTEGER DEFAULT 0,
  p_block_hours INTEGER DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_blocked_id UUID;
BEGIN
  -- Insert or update blocked IP
  INSERT INTO public.blocked_ips (
    ip_address,
    reason,
    blocked_until,
    auto_blocked,
    attempt_count
  ) VALUES (
    p_ip_address,
    p_reason,
    now() + (p_block_hours || ' hours')::interval,
    true,
    p_attempt_count
  )
  ON CONFLICT (ip_address) WHERE unblocked_at IS NULL
  DO UPDATE SET
    attempt_count = blocked_ips.attempt_count + p_attempt_count,
    blocked_until = CASE 
      WHEN blocked_ips.attempt_count + p_attempt_count > 20 THEN NULL
      ELSE now() + (p_block_hours || ' hours')::interval
    END,
    is_permanent = blocked_ips.attempt_count + p_attempt_count > 20,
    reason = p_reason
  RETURNING id INTO v_blocked_id;
  
  RETURN v_blocked_id;
END;
$$;

-- Function to unblock IP
CREATE OR REPLACE FUNCTION public.unblock_ip(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can unblock IPs';
  END IF;
  
  UPDATE public.blocked_ips
  SET 
    unblocked_at = now(),
    unblocked_by = auth.uid()
  WHERE ip_address = p_ip_address
  AND unblocked_at IS NULL;
  
  RETURN FOUND;
END;
$$;
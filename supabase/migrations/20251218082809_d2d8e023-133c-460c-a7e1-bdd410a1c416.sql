-- Create whitelist table for trusted IPs
CREATE TABLE public.ip_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT unique_whitelist_ip UNIQUE (ip_address)
);

-- Enable RLS
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage whitelist
CREATE POLICY "Only admins can view whitelist" 
ON public.ip_whitelist FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert whitelist" 
ON public.ip_whitelist FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update whitelist" 
ON public.ip_whitelist FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete whitelist" 
ON public.ip_whitelist FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if IP is whitelisted
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ip_whitelist
    WHERE ip_address = check_ip
    AND is_active = true
  );
END;
$$;

-- Update auto_block_ip to check whitelist first
CREATE OR REPLACE FUNCTION public.auto_block_ip(
  p_ip_address TEXT,
  p_reason TEXT,
  p_attempt_count INTEGER DEFAULT 0,
  p_block_hours INTEGER DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked_id UUID;
BEGIN
  -- Check if IP is whitelisted - if so, do not block
  IF is_ip_whitelisted(p_ip_address) THEN
    RETURN NULL;
  END IF;

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
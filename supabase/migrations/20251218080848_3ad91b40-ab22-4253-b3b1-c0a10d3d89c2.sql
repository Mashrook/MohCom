-- Create table for allowed admin IPs
CREATE TABLE public.admin_allowed_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(ip_address)
);

-- Enable RLS
ALTER TABLE public.admin_allowed_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage allowed IPs
CREATE POLICY "Only admins can view allowed IPs"
ON public.admin_allowed_ips
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert allowed IPs"
ON public.admin_allowed_ips
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update allowed IPs"
ON public.admin_allowed_ips
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete allowed IPs"
ON public.admin_allowed_ips
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create settings table for IP restriction toggle
CREATE TABLE public.admin_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admin_security_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for IP check)
CREATE POLICY "Anyone can view admin security settings"
ON public.admin_security_settings
FOR SELECT
USING (true);

-- Only admins can manage settings
CREATE POLICY "Only admins can update admin security settings"
ON public.admin_security_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert admin security settings"
ON public.admin_security_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default setting (IP restriction disabled by default)
INSERT INTO public.admin_security_settings (setting_key, setting_value)
VALUES ('ip_restriction_enabled', false);

-- Create function to check if IP is allowed
CREATE OR REPLACE FUNCTION public.is_admin_ip_allowed(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restriction_enabled BOOLEAN;
BEGIN
  -- Check if IP restriction is enabled
  SELECT setting_value INTO restriction_enabled
  FROM public.admin_security_settings
  WHERE setting_key = 'ip_restriction_enabled';
  
  -- If restriction is disabled, allow all
  IF restriction_enabled IS NULL OR restriction_enabled = false THEN
    RETURN true;
  END IF;
  
  -- Check if IP is in allowed list
  RETURN EXISTS (
    SELECT 1 FROM public.admin_allowed_ips
    WHERE ip_address = check_ip
    AND is_active = true
  );
END;
$$;
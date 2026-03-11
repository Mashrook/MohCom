-- Create blocked_payment_users table to track blocked users
CREATE TABLE public.blocked_payment_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  blocked_by UUID NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID
);

-- Enable RLS
ALTER TABLE public.blocked_payment_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view blocked users
CREATE POLICY "Only admins can view blocked users"
ON public.blocked_payment_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can block users
CREATE POLICY "Only admins can block users"
ON public.blocked_payment_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update blocked users (for unblocking)
CREATE POLICY "Only admins can update blocked users"
ON public.blocked_payment_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete blocked users records
CREATE POLICY "Only admins can delete blocked users"
ON public.blocked_payment_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create function to check if user is blocked from payments
CREATE OR REPLACE FUNCTION public.is_user_payment_blocked(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_payment_users
    WHERE user_id = target_user_id
      AND unblocked_at IS NULL
  )
$$;
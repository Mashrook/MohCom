-- Drop the existing admin_subscription_view
DROP VIEW IF EXISTS public.admin_subscription_view;

-- Create a secure function that only admins can use to get subscription data
CREATE OR REPLACE FUNCTION public.get_admin_subscription_view()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  plan_type text,
  status text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    p.full_name,
    p.email,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    s.updated_at
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON s.user_id = p.id
  ORDER BY s.created_at DESC;
END;
$$;

-- Revoke all permissions and grant only to authenticated users (function checks admin role internally)
REVOKE ALL ON FUNCTION public.get_admin_subscription_view() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_subscription_view() TO authenticated;
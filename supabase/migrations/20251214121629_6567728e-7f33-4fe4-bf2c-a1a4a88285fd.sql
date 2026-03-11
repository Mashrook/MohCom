-- Remove email column from profiles table (email is already in auth.users)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Create secure function for admins to get user emails from auth.users
CREATE OR REPLACE FUNCTION public.get_user_email_for_admin(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin role internally)
REVOKE ALL ON FUNCTION public.get_user_email_for_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_email_for_admin(uuid) TO authenticated;

-- Update the get_admin_subscription_view function to use auth.users for email
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
    u.email,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.created_at,
    s.updated_at
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON s.user_id = p.id
  LEFT JOIN auth.users u ON s.user_id = u.id
  ORDER BY s.created_at DESC;
END;
$$;

-- Update handle_new_user function to not insert email into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'inactive');
  
  RETURN NEW;
END;
$$;
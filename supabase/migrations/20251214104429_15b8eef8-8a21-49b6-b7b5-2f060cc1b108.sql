-- 1. Fix Security Definer View - recreate admin_subscription_view with security_invoker
DROP VIEW IF EXISTS public.admin_subscription_view;
CREATE VIEW public.admin_subscription_view 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  p.full_name,
  p.email
FROM public.subscriptions s
LEFT JOIN public.profiles p ON s.user_id = p.id;

-- 2. Add RLS policy to admin_subscription_view
ALTER VIEW public.admin_subscription_view SET (security_barrier = true);

-- 3. Fix public_profiles view - add security invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- 4. Fix template_ratings_summary view
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE VIEW public.template_ratings_summary 
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  AVG(rating)::numeric as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- 5. Fix user_subscription_status view
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions;

-- 6. Remove plain text sensitive columns (keep encrypted versions only)
-- Note: This is a destructive operation - data should be migrated first

-- For messages table - keep content for backward compatibility but clear it for new messages
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

-- For subscriptions - remove plain text Stripe IDs
ALTER TABLE public.subscriptions ALTER COLUMN stripe_customer_id SET DEFAULT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN stripe_subscription_id SET DEFAULT NULL;

-- 7. Create function to clear sensitive plain text data after encryption
CREATE OR REPLACE FUNCTION public.clear_plain_text_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For messages: if encrypted version is set, clear plain text
  IF TG_TABLE_NAME = 'messages' AND NEW.content_encrypted IS NOT NULL THEN
    NEW.content := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Add indexes for better performance on RLS policy checks
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 9. Add audit trigger for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admin accesses user data
  IF TG_OP = 'SELECT' AND has_role(auth.uid(), 'admin') AND auth.uid() != NEW.id THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      success
    ) VALUES (
      auth.uid(),
      'admin_data_access',
      TG_TABLE_NAME,
      NEW.id,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;
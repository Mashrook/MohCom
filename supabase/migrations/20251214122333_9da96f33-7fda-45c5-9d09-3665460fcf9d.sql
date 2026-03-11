-- Fix 1: Clear unencrypted sensitive data where encrypted version exists

-- Clear unencrypted lawyer_ai_chats messages where encrypted exists
UPDATE public.lawyer_ai_chats 
SET messages = '[]'::jsonb 
WHERE messages_encrypted IS NOT NULL AND messages IS NOT NULL AND messages != '[]'::jsonb;

-- Clear unencrypted contract_text where encrypted exists
UPDATE public.contract_analyses 
SET contract_text = '[encrypted]' 
WHERE contract_text_encrypted IS NOT NULL AND contract_text IS NOT NULL AND contract_text != '[encrypted]';

-- Clear unencrypted filled_content where encrypted exists  
UPDATE public.saved_contracts 
SET filled_content = '[encrypted]' 
WHERE filled_content_encrypted IS NOT NULL AND filled_content IS NOT NULL AND filled_content != '[encrypted]';

-- Clear unencrypted stripe IDs where encrypted exists
UPDATE public.subscriptions 
SET stripe_customer_id = NULL, stripe_subscription_id = NULL 
WHERE stripe_customer_id_encrypted IS NOT NULL OR stripe_subscription_id_encrypted IS NOT NULL;

-- Fix 2: Restrict premium contract templates to subscribed users only
DROP POLICY IF EXISTS "Anyone can view contract templates" ON public.contract_templates;

CREATE POLICY "Anyone can view free contract templates" 
ON public.contract_templates 
FOR SELECT 
USING (is_premium = false OR is_premium IS NULL);

CREATE POLICY "Subscribed users can view premium templates" 
ON public.contract_templates 
FOR SELECT 
USING (
  is_premium = true AND (
    EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'lawyer')
  )
);

-- Fix 3: Add RLS to user_subscription_status view (drop and recreate as secure view)
DROP VIEW IF EXISTS public.user_subscription_status;

CREATE VIEW public.user_subscription_status 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE user_id = auth.uid();

-- Fix 4: Restrict user_presence to authenticated users
DROP POLICY IF EXISTS "Anyone can view presence" ON public.user_presence;

CREATE POLICY "Authenticated users can view presence" 
ON public.user_presence 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 5: Restrict public_profiles view to authenticated users only
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant select on views to authenticated users
GRANT SELECT ON public.user_subscription_status TO authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;
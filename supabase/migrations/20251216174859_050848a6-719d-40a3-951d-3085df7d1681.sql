-- Fix Views with security_invoker = true to inherit RLS policies

-- Drop and recreate public_profiles view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Drop and recreate user_subscription_status view with proper security
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status WITH (security_invoker = true) AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE auth.uid() = user_id OR has_role(auth.uid(), 'admin');

-- Drop and recreate template_ratings_summary view with security_invoker
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE VIEW public.template_ratings_summary WITH (security_invoker = true) AS
SELECT 
  template_id,
  COALESCE(AVG(rating), 0) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
WHERE auth.uid() IS NOT NULL
GROUP BY template_id;

-- Add additional RLS policy for profiles to allow authenticated users to view other profiles
CREATE POLICY "Authenticated users can view profiles for messaging" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = id OR
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM messages 
      WHERE (sender_id = profiles.id AND receiver_id = auth.uid())
         OR (receiver_id = profiles.id AND sender_id = auth.uid())
    )
  )
);

-- Add extra security check for lawyer_ai_chats
DROP POLICY IF EXISTS "Lawyers can view their own chats" ON public.lawyer_ai_chats;
CREATE POLICY "Lawyers can view their own chats" 
ON public.lawyer_ai_chats 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = lawyer_id AND 
  has_role(auth.uid(), 'lawyer')
);

-- Add extra security check for contract_analyses
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.contract_analyses;
CREATE POLICY "Users can view their own analyses" 
ON public.contract_analyses 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Add extra security check for saved_contracts
DROP POLICY IF EXISTS "Users can view their own saved contracts" ON public.saved_contracts;
CREATE POLICY "Users can view their own saved contracts" 
ON public.saved_contracts 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);
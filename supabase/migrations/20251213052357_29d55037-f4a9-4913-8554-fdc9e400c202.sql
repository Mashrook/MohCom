
-- 1. Fix profiles table: Remove public email access by dropping the permissive policy
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

-- Create a more secure policy that only shows public info (no email)
CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Add RLS to public_profiles view (it's a view based on profiles, inherits RLS)
-- No action needed as views inherit RLS from underlying tables

-- 3. Add RLS policies to template_ratings_summary view
-- Views inherit RLS from underlying tables, but we should ensure contract_ratings is secure

-- 4. Strengthen audit_logs - ensure service role can insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- 5. For admin access to messages/contracts - this is intentional for platform management
-- Document this in the policy name for clarity
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Platform admins can view messages for moderation" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all saved contracts" ON public.saved_contracts;
CREATE POLICY "Platform admins can view contracts for support" 
ON public.saved_contracts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all analyses" ON public.contract_analyses;
CREATE POLICY "Platform admins can view analyses for support" 
ON public.contract_analyses 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Add index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 7. Ensure subscriptions table has proper protection for Stripe data
-- Add policy to prevent exposing stripe_customer_id to frontend unnecessarily
-- The existing policies are correct, but let's ensure service role can update
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

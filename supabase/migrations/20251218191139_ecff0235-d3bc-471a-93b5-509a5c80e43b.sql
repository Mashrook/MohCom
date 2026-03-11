-- Drop existing insert policy and recreate all policies properly
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Recreate policies for subscriptions table
CREATE POLICY "Users can insert their own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Document the lawyer_public_info view as intentionally public
COMMENT ON VIEW public.lawyer_public_info IS 'Public lawyer directory - intentionally accessible for users to find lawyers. Only shows professional information, not private data.';
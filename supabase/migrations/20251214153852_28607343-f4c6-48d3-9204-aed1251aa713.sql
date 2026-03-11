-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Create a more restrictive policy: only owner and admins
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins can view profiles for administrative purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Lawyers can only view profiles of users they have messages with
CREATE POLICY "Lawyers can view profiles of conversation partners" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'lawyer'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.messages 
    WHERE (messages.sender_id = auth.uid() AND messages.receiver_id = profiles.id)
       OR (messages.receiver_id = auth.uid() AND messages.sender_id = profiles.id)
  )
);
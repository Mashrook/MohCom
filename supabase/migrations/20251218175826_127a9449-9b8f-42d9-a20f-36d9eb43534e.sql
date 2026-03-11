-- Drop existing policy that allows email enumeration
DROP POLICY IF EXISTS "Admins and applicant can view applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Applicants can view their own applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Anyone can submit application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.lawyer_applications;

-- Create secure admin-only SELECT policy
CREATE POLICY "Only admins can view applications"
ON public.lawyer_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create policy for INSERT - anyone authenticated can apply
CREATE POLICY "Authenticated users can submit applications"
ON public.lawyer_applications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy for UPDATE - only admins can update
CREATE POLICY "Only admins can update applications"
ON public.lawyer_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create policy for DELETE - only admins can delete
CREATE POLICY "Only admins can delete applications"
ON public.lawyer_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create secure function for applicants to check their own application status
-- This prevents email enumeration by using auth.uid() to get the user's email
CREATE OR REPLACE FUNCTION public.get_my_lawyer_application_status()
RETURNS TABLE (
  id uuid,
  status text,
  created_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the authenticated user's email
  SELECT email INTO user_email FROM auth.users WHERE auth.users.id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Return only limited status information for the user's own applications
  RETURN QUERY
  SELECT 
    la.id,
    la.status,
    la.created_at,
    la.reviewed_at,
    la.rejection_reason
  FROM public.lawyer_applications la
  WHERE la.email = user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_lawyer_application_status() TO authenticated;
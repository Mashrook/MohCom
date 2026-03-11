
-- Add RLS policies for lawyer_applications (RLS is already enabled)
-- Allow admins full access
CREATE POLICY "Admins full access to lawyer_applications"
ON public.lawyer_applications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anonymous inserts for new applications (applicants aren't logged in)
CREATE POLICY "Anyone can submit lawyer application"
ON public.lawyer_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow authenticated users to check their own application status via the RPC function only
-- (get_my_lawyer_application_status is SECURITY DEFINER so it bypasses RLS)

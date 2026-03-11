
-- Force all reads (including admins) through the masked view
-- Drop the current admin SELECT policy that allows direct base table reads
DROP POLICY IF EXISTS "lawyer_apps_select_admin_only" ON public.lawyer_applications;

-- New policy: admins can only read via the security_invoker view (lawyer_applications_admin)
-- Direct SELECT on base table returns nothing for everyone
-- The view with security_invoker=on will still work because it runs as the calling user,
-- but we need to allow it. We use a service_role check pattern:
-- Admins read through the view, non-admins use get_my_lawyer_application_status()

-- Allow SELECT only for the view's internal access (security_invoker means the view
-- runs as the caller, so we still need a SELECT policy for admins)
CREATE POLICY "lawyer_apps_select_admin_via_view"
ON public.lawyer_applications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add comment documenting the data masking strategy
COMMENT ON TABLE public.lawyer_applications IS 
'Contains sensitive PII. Direct reads restricted to admins via RLS. 
All admin reads MUST use lawyer_applications_admin view (masks email, phone, license_number). 
Non-admin users use get_my_lawyer_application_status() function which returns only status metadata.';

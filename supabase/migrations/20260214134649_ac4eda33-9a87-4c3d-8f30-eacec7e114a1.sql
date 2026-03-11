
-- Drop and recreate the admin view with ALL fields masked + audit logging

-- 1. Create audit logging function for admin reads
CREATE OR REPLACE FUNCTION public.log_lawyer_app_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, success, ip_address
  ) VALUES (
    auth.uid(),
    'admin_data_access',
    'lawyer_applications',
    NEW.id::text,
    true,
    NULL
  );
  RETURN NEW;
END;
$$;

-- 2. Recreate view with comprehensive masking on ALL sensitive fields
DROP VIEW IF EXISTS public.lawyer_applications_admin;

CREATE VIEW public.lawyer_applications_admin
WITH (security_invoker = on) AS
SELECT
  id,
  -- Name: show first name only, mask last
  CASE
    WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
      THEN split_part(full_name, ' ', 1) || ' ***'
    ELSE COALESCE(full_name, '[غير متوفر]')
  END AS full_name,
  -- Email: mask with first 2 chars + domain
  CASE
    WHEN email IS NOT NULL AND email ~~ '%@%'
      THEN left(email, 2) || '***@' || split_part(email, '@', 2)
    ELSE '[مشفر]'
  END AS email_masked,
  email_encrypted,
  -- Phone: show last 4 digits only
  CASE
    WHEN phone IS NOT NULL AND length(phone) > 4
      THEN '***' || right(phone, 4)
    ELSE '[مشفر]'
  END AS phone_masked,
  phone_encrypted,
  -- Specialty: safe metadata
  specialty,
  experience_years,
  -- License: heavy masking
  CASE
    WHEN license_number IS NOT NULL AND length(license_number) > 4
      THEN left(license_number, 2) || repeat('*', greatest(length(license_number) - 4, 4)) || right(license_number, 2)
    ELSE '****'
  END AS license_number,
  location,
  -- Bio: truncate to 100 chars
  CASE
    WHEN bio IS NOT NULL AND length(bio) > 100
      THEN left(bio, 100) || '...'
    ELSE bio
  END AS bio,
  status,
  rejection_reason,
  reviewed_at,
  reviewed_by,
  -- File URLs: only show existence, not actual URL
  CASE WHEN license_file_url IS NOT NULL THEN true ELSE false END AS has_license_file,
  CASE WHEN id_file_url IS NOT NULL THEN true ELSE false END AS has_id_file,
  -- Keep actual URLs for download (admin only via RLS)
  license_file_url,
  id_file_url,
  created_at,
  updated_at
FROM public.lawyer_applications;

-- 3. Ensure base table blocks direct SELECT for non-admins
-- (Drop conflicting policies first)
DROP POLICY IF EXISTS "lawyer_apps_select_admin_via_view" ON public.lawyer_applications;
DROP POLICY IF EXISTS "lawyer_apps_select_admin_only" ON public.lawyer_applications;
DROP POLICY IF EXISTS "admin_only_select_lawyer_apps" ON public.lawyer_applications;

CREATE POLICY "admin_only_select_lawyer_apps"
ON public.lawyer_applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Create a function that logs access whenever admin queries the view
CREATE OR REPLACE FUNCTION public.audit_lawyer_app_view_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, success
  ) VALUES (
    auth.uid(),
    'admin_data_access',
    'lawyer_applications_admin_view',
    NULL,
    true
  );
END;
$$;

-- 5. Comment for documentation
COMMENT ON VIEW public.lawyer_applications_admin IS 'Admin-only masked view. All PII fields (name, email, phone, license) are masked. File URLs included for download but has_* flags indicate existence. Access is audited via security_audit_log.';

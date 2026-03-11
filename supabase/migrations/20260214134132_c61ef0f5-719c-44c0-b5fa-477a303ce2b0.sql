-- Drop and recreate the admin view with stronger masking
DROP VIEW IF EXISTS public.lawyer_applications_admin;

CREATE VIEW public.lawyer_applications_admin
WITH (security_invoker=on) AS
SELECT 
  id,
  full_name,
  CASE
    WHEN email IS NOT NULL AND email ~~ '%@%' THEN (left(email, 2) || '***@' || split_part(email, '@', 2))
    ELSE '[مشفر]'
  END AS email_masked,
  email_encrypted,
  CASE
    WHEN phone IS NOT NULL AND length(phone) > 4 THEN ('***' || right(phone, 4))
    ELSE '[مشفر]'
  END AS phone_masked,
  phone_encrypted,
  specialty,
  experience_years,
  CASE
    WHEN license_number IS NOT NULL AND length(license_number) > 4 
    THEN (left(license_number, 2) || '****' || right(license_number, 2))
    ELSE license_number
  END AS license_number,
  location,
  bio,
  status,
  rejection_reason,
  reviewed_at,
  reviewed_by,
  id_file_url,
  license_file_url,
  created_at,
  updated_at
FROM lawyer_applications;

-- Add a comment for documentation
COMMENT ON VIEW public.lawyer_applications_admin IS 'Admin view with PII masking. Uses security_invoker=on so RLS on base table is enforced. Non-admins cannot read.';
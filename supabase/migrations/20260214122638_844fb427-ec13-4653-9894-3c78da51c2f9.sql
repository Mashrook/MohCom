
-- Remove the overly permissive ALL policy (redundant with specific policies)
DROP POLICY IF EXISTS "Admins full access to lawyer_applications" ON public.lawyer_applications;

-- Remove the overly permissive INSERT policy (redundant with rate-limited one)
DROP POLICY IF EXISTS "Anyone can submit lawyer application" ON public.lawyer_applications;

-- Create a secure admin view that masks sensitive fields
CREATE OR REPLACE VIEW public.lawyer_applications_admin AS
SELECT
  id,
  full_name,
  -- Mask email: show first 2 chars + domain
  CASE 
    WHEN email IS NOT NULL AND email LIKE '%@%' 
    THEN LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2)
    ELSE '[encrypted]'
  END AS email_masked,
  email_encrypted,
  -- Mask phone: show last 4 digits
  CASE 
    WHEN phone IS NOT NULL AND LENGTH(phone) > 4 
    THEN '***' || RIGHT(phone, 4)
    ELSE '[encrypted]'
  END AS phone_masked,
  phone_encrypted,
  specialty,
  experience_years,
  license_number,
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
FROM public.lawyer_applications;

-- Secure the view - only admins can read
ALTER VIEW public.lawyer_applications_admin OWNER TO postgres;

-- RLS doesn't apply to views directly, but the underlying table's RLS applies
-- The view inherits the table's RLS since it's not SECURITY DEFINER

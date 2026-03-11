-- Fix 1: lawyer_applications - Allow anyone to insert, but only admin and applicant can view
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Authenticated users view own applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can view all lawyer applications" ON public.lawyer_applications;

-- Allow anyone (even unauthenticated) to submit applications
CREATE POLICY "Anyone can submit lawyer applications"
ON public.lawyer_applications
FOR INSERT
WITH CHECK (true);

-- Only admins and the applicant (via email match) can view applications
CREATE POLICY "Admins and applicant can view applications"
ON public.lawyer_applications
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Only admins can update applications
DROP POLICY IF EXISTS "Admins can manage lawyer applications" ON public.lawyer_applications;
CREATE POLICY "Admins can update lawyer applications"
ON public.lawyer_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete applications
CREATE POLICY "Admins can delete lawyer applications"
ON public.lawyer_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Fix 2: lawyer_profiles - Only lawyers and admins can view, with admin toggle control
DROP POLICY IF EXISTS "Public can view basic lawyer info" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Lawyers can view own profile" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Admins can view all lawyer profiles" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Anyone can view lawyer profiles" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Public can view available lawyer profiles" ON public.lawyer_profiles;

-- Create function to check if lawyer listing is enabled
CREATE OR REPLACE FUNCTION public.is_lawyer_listing_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.section_settings WHERE section_key = 'lawyers' LIMIT 1),
    true
  )
$$;

-- Admins can always view all lawyer profiles
CREATE POLICY "Admins can view all lawyer profiles"
ON public.lawyer_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Lawyers can view lawyer profiles only if listing is enabled (or own profile)
CREATE POLICY "Lawyers can view lawyer profiles when enabled"
ON public.lawyer_profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'lawyer') 
  AND (is_lawyer_listing_enabled() OR auth.uid() = user_id)
);

-- Lawyers can update their own profile
DROP POLICY IF EXISTS "Lawyers can update their own profile" ON public.lawyer_profiles;
CREATE POLICY "Lawyers can update their own profile"
ON public.lawyer_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix 3: Create a view for public lawyer info without user_id
CREATE OR REPLACE VIEW public.lawyer_public_info
WITH (security_invoker = true) AS
SELECT 
  lp.id,
  p.full_name,
  p.avatar_url,
  lp.specialty,
  lp.experience_years,
  lp.hourly_rate,
  lp.location,
  lp.bio,
  lp.is_available,
  lp.rating,
  lp.reviews_count,
  lp.badges
FROM public.lawyer_profiles lp
JOIN public.profiles p ON lp.user_id = p.id
WHERE lp.is_available = true;
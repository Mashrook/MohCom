-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view site content" ON public.site_content;

-- Create a restrictive policy that only allows admins to SELECT from the base table
CREATE POLICY "Only admins can select site content"
ON public.site_content
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create a public view that exposes only safe columns for public consumption
-- This view excludes potentially sensitive data like updated_by (admin user IDs)
CREATE OR REPLACE VIEW public.public_site_content
WITH (security_invoker = on)
AS SELECT 
  id,
  page_key,
  title,
  subtitle,
  description,
  content,
  images,
  updated_at
FROM public.site_content;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_site_content TO anon;
GRANT SELECT ON public.public_site_content TO authenticated;

-- Create a policy that allows public access through the view
-- Since security_invoker is on, we need a policy that allows the view to read
DROP POLICY IF EXISTS "Only admins can select site content" ON public.site_content;

-- Create policy for admin full access
CREATE POLICY "Admins can select all site content"
ON public.site_content
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create policy for public view access (only specific safe page_keys)
CREATE POLICY "Public can view published content"
ON public.site_content
FOR SELECT
TO anon, authenticated
USING (
  page_key IN (
    'home_video', 
    'hero', 
    'footer', 
    'about', 
    'contact',
    'features',
    'services',
    'how_it_works',
    'testimonials',
    'faq'
  )
);
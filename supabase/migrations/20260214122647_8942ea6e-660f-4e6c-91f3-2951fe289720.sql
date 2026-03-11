
-- Fix: Set view to SECURITY INVOKER so RLS of the querying user applies
ALTER VIEW public.lawyer_applications_admin SET (security_invoker = on);

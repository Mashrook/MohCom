-- Fix template_ratings_summary view to use security_invoker
DROP VIEW IF EXISTS public.template_ratings_summary;

CREATE VIEW public.template_ratings_summary 
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  AVG(rating) AS average_rating,
  COUNT(*) AS total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- Grant select to authenticated users
GRANT SELECT ON public.template_ratings_summary TO authenticated;

-- Also grant to anon for public template ratings display
GRANT SELECT ON public.template_ratings_summary TO anon;
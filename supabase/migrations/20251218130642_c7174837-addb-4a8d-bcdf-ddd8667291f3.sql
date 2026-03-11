-- Add sector column to contract_templates
ALTER TABLE public.contract_templates 
ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'عام';

-- Add comment for clarity
COMMENT ON COLUMN public.contract_templates.sector IS 'Contract sector classification: عقاري (Real Estate), تجاري (Commercial), شخصي (Personal), عام (General)';
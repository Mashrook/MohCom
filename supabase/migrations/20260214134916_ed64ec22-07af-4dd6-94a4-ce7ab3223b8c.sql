
-- ===================================================================
-- 1. Auto-clear plaintext email/phone in lawyer_applications after encryption
-- ===================================================================

-- Create trigger function to clear plaintext PII after encryption
CREATE OR REPLACE FUNCTION public.clear_lawyer_app_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email_encrypted IS NOT NULL THEN
    NEW.email := '[encrypted]';
  END IF;
  IF NEW.phone_encrypted IS NOT NULL THEN
    NEW.phone := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger (runs AFTER the encryption trigger)
DROP TRIGGER IF EXISTS clear_lawyer_app_pii_trigger ON public.lawyer_applications;
CREATE TRIGGER clear_lawyer_app_pii_trigger
  BEFORE INSERT OR UPDATE ON public.lawyer_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_lawyer_app_plaintext_after_encryption();

-- Clear any existing plaintext data where encrypted version exists
UPDATE public.lawyer_applications
SET email = '[encrypted]', phone = '[encrypted]'
WHERE email_encrypted IS NOT NULL OR phone_encrypted IS NOT NULL;

-- Document the columns
COMMENT ON COLUMN public.lawyer_applications.email IS 'DEPRECATED: Auto-cleared after encryption. Use email_encrypted or lawyer_applications_admin view.';
COMMENT ON COLUMN public.lawyer_applications.phone IS 'DEPRECATED: Auto-cleared after encryption. Use phone_encrypted or lawyer_applications_admin view.';

-- Verify RLS is enabled on both tables
ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (extra security)
ALTER TABLE public.lawyer_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history FORCE ROW LEVEL SECURITY;

-- Clean up duplicate RLS policies on lawyer_applications
DROP POLICY IF EXISTS "Admins can delete applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can delete lawyer applications" ON public.lawyer_applications;

-- Keep only one delete policy
CREATE POLICY "Admins can delete lawyer applications" ON public.lawyer_applications
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Update payment_history to clear plaintext Tap IDs after encryption
-- This replaces plaintext values with a placeholder once encrypted version exists
UPDATE public.payment_history 
SET tap_charge_id = '[encrypted]'
WHERE tap_charge_id IS NOT NULL 
  AND tap_charge_id != '[encrypted]'
  AND tap_charge_id_encrypted IS NOT NULL;

UPDATE public.payment_history 
SET tap_receipt_id = '[encrypted]'
WHERE tap_receipt_id IS NOT NULL 
  AND tap_receipt_id != '[encrypted]'
  AND tap_receipt_id_encrypted IS NOT NULL;

-- Add trigger to automatically clear plaintext after encryption
CREATE OR REPLACE FUNCTION public.clear_payment_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear plaintext charge ID if encrypted version exists
  IF NEW.tap_charge_id_encrypted IS NOT NULL THEN
    NEW.tap_charge_id := '[encrypted]';
  END IF;
  
  -- Clear plaintext receipt ID if encrypted version exists
  IF NEW.tap_receipt_id_encrypted IS NOT NULL THEN
    NEW.tap_receipt_id := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for payment history
DROP TRIGGER IF EXISTS clear_payment_plaintext ON public.payment_history;
CREATE TRIGGER clear_payment_plaintext
  BEFORE INSERT OR UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_payment_plaintext_after_encryption();
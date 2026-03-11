-- إضافة أعمدة مشفرة لمعرفات Tap Payments
ALTER TABLE public.payment_history
ADD COLUMN IF NOT EXISTS tap_charge_id_encrypted bytea,
ADD COLUMN IF NOT EXISTS tap_receipt_id_encrypted bytea;

-- إنشاء دالة تشفير معرفات Tap
CREATE OR REPLACE FUNCTION public.encrypt_tap_payment_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tap_charge_id IS NOT NULL AND NEW.tap_charge_id != '' THEN
    NEW.tap_charge_id_encrypted := encrypt_sensitive_data(NEW.tap_charge_id);
  END IF;
  IF NEW.tap_receipt_id IS NOT NULL AND NEW.tap_receipt_id != '' THEN
    NEW.tap_receipt_id_encrypted := encrypt_sensitive_data(NEW.tap_receipt_id);
  END IF;
  RETURN NEW;
END;
$$;

-- إنشاء trigger للتشفير التلقائي
DROP TRIGGER IF EXISTS encrypt_tap_ids_trigger ON public.payment_history;
CREATE TRIGGER encrypt_tap_ids_trigger
  BEFORE INSERT OR UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_tap_payment_ids();

-- تشفير البيانات الموجودة
UPDATE public.payment_history 
SET 
  tap_charge_id_encrypted = encrypt_sensitive_data(tap_charge_id),
  tap_receipt_id_encrypted = encrypt_sensitive_data(tap_receipt_id)
WHERE 
  (tap_charge_id IS NOT NULL AND tap_charge_id != '' AND tap_charge_id_encrypted IS NULL)
  OR (tap_receipt_id IS NOT NULL AND tap_receipt_id != '' AND tap_receipt_id_encrypted IS NULL);

-- مسح البيانات النصية الأصلية بعد التشفير
UPDATE public.payment_history 
SET 
  tap_charge_id = '[encrypted]',
  tap_receipt_id = '[encrypted]'
WHERE 
  tap_charge_id_encrypted IS NOT NULL 
  OR tap_receipt_id_encrypted IS NOT NULL;
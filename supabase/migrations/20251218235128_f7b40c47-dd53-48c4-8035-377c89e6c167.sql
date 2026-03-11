-- إضافة RLS للـ Views وتحسين الأمان

-- 1. إنشاء سياسة أمان للـ user_subscription_status view
-- تحويل الـ view إلى materialized أو استخدام security barrier
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE OR REPLACE VIEW public.user_subscription_status
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_end
FROM public.subscriptions s
WHERE s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin');

-- 2. تحسين profiles policies - السماح للمستخدمين بمشاهدة ملفاتهم الشخصية فقط
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 3. إضافة سياسة انتهاء صلاحية الروابط المشتركة
-- إضافة فحص انتهاء الصلاحية في السياسة
DROP POLICY IF EXISTS "Anyone can view by token" ON public.shared_contracts;
CREATE POLICY "Anyone can view valid shared contracts"
ON public.shared_contracts
FOR SELECT
USING (
  (expires_at IS NULL OR expires_at > now())
);

-- 4. إضافة rate limiting للروابط المشتركة - زيادة view_count
CREATE OR REPLACE FUNCTION public.increment_shared_contract_view(p_token TEXT)
RETURNS VOID AS $$
DECLARE
  v_view_count INT;
BEGIN
  -- التحقق من عدد المشاهدات
  SELECT COALESCE(view_count, 0) INTO v_view_count
  FROM public.shared_contracts
  WHERE share_token = p_token;
  
  -- منع الإساءة - حد 1000 مشاهدة
  IF v_view_count >= 1000 THEN
    RAISE EXCEPTION 'تم تجاوز الحد الأقصى للمشاهدات';
  END IF;
  
  UPDATE public.shared_contracts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE share_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. تشفير بيانات المحامين الحساسة
-- إضافة عمود مشفر للبريد الإلكتروني والهاتف
ALTER TABLE public.lawyer_applications 
ADD COLUMN IF NOT EXISTS email_encrypted TEXT,
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- 6. إنشاء دالة لتشفير بيانات المتقدمين الجدد
CREATE OR REPLACE FUNCTION public.encrypt_lawyer_application_pii()
RETURNS TRIGGER AS $$
BEGIN
  -- تشفير البريد الإلكتروني
  IF NEW.email IS NOT NULL AND NEW.email_encrypted IS NULL THEN
    NEW.email_encrypted := public.encrypt_sensitive_data(NEW.email);
  END IF;
  
  -- تشفير رقم الهاتف
  IF NEW.phone IS NOT NULL AND NEW.phone_encrypted IS NULL THEN
    NEW.phone_encrypted := public.encrypt_sensitive_data(NEW.phone);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إضافة trigger للتشفير التلقائي
DROP TRIGGER IF EXISTS encrypt_lawyer_pii_trigger ON public.lawyer_applications;
CREATE TRIGGER encrypt_lawyer_pii_trigger
BEFORE INSERT OR UPDATE ON public.lawyer_applications
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_lawyer_application_pii();

-- 7. إضافة جدول لتتبع محاولات الوصول المشبوهة
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  ip_address TEXT,
  user_id UUID,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT
);

-- تفعيل RLS على جدول الحوادث الأمنية
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- فقط المسؤولين يمكنهم رؤية الحوادث
CREATE POLICY "Only admins can view security incidents"
ON public.security_incidents
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert security incidents"
ON public.security_incidents
FOR INSERT
WITH CHECK (true);

-- 8. دالة لتسجيل الحوادث الأمنية
CREATE OR REPLACE FUNCTION public.log_security_incident(
  p_incident_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_description TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_blocked BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_incident_id UUID;
BEGIN
  INSERT INTO public.security_incidents (
    incident_type,
    severity,
    description,
    ip_address,
    user_id,
    user_agent,
    request_path,
    blocked
  ) VALUES (
    p_incident_type,
    p_severity,
    p_description,
    p_ip_address,
    auth.uid(),
    p_user_agent,
    p_request_path,
    p_blocked
  )
  RETURNING id INTO v_incident_id;
  
  RETURN v_incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
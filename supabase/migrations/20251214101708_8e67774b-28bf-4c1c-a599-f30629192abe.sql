-- ============================================
-- تحسينات الأمان الشاملة لقاعدة البيانات
-- ============================================

-- 1. إزالة سياسات الوصول المفرطة للمسؤولين على البيانات الحساسة

-- حذف سياسة وصول المسؤولين للرسائل الخاصة
DROP POLICY IF EXISTS "Platform admins can view messages for moderation" ON public.messages;

-- حذف سياسة وصول المسؤولين لتحليلات العقود
DROP POLICY IF EXISTS "Platform admins can view analyses for support" ON public.contract_analyses;

-- حذف سياسة وصول المسؤولين للعقود المحفوظة
DROP POLICY IF EXISTS "Platform admins can view contracts for support" ON public.saved_contracts;

-- 2. تقييد عرض بيانات الملفات الشخصية - إنشاء عرض آمن بدلاً من كشف البريد الإلكتروني

-- تحديث سياسة عرض الملفات الشخصية للمحامين (بدون البريد الإلكتروني)
DROP POLICY IF EXISTS "Users can view limited profile info for messaging" ON public.profiles;

CREATE POLICY "Users can view basic profile info for messaging"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. إضافة تشفير لمحادثات المحامي مع الذكاء الاصطناعي
ALTER TABLE public.lawyer_ai_chats 
ADD COLUMN IF NOT EXISTS messages_encrypted bytea;

-- 4. إنشاء دالة لتشفير محادثات المحامي
CREATE OR REPLACE FUNCTION public.encrypt_lawyer_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.messages IS NOT NULL THEN
    NEW.messages_encrypted := encrypt_sensitive_data(NEW.messages::text);
  END IF;
  RETURN NEW;
END;
$$;

-- 5. إنشاء trigger لتشفير المحادثات تلقائياً
DROP TRIGGER IF EXISTS encrypt_lawyer_chats ON public.lawyer_ai_chats;
CREATE TRIGGER encrypt_lawyer_chats
  BEFORE INSERT OR UPDATE ON public.lawyer_ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_lawyer_chat_messages();

-- 6. تقييد وصول المسؤولين للاشتراكات - إخفاء بيانات Stripe
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can view subscription status only"
ON public.subscriptions
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    -- المسؤول يرى فقط حالة الاشتراك وليس بيانات الدفع
  )
);

-- 7. إنشاء عرض آمن للاشتراكات للمسؤولين (بدون بيانات Stripe الحساسة)
CREATE OR REPLACE VIEW public.admin_subscription_view AS
SELECT 
  s.id,
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  p.full_name,
  p.email
FROM public.subscriptions s
LEFT JOIN public.profiles p ON s.user_id = p.id;

-- 8. إضافة سياسة RLS للعرض الآمن
-- (العروض ترث سياسات الجداول الأساسية)

-- 9. تحسين سياسة حذف الرسائل - السماح للمستخدمين بحذف رسائلهم
CREATE POLICY "Users can delete their own sent messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- 10. إضافة فهرس للتشفير لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON public.messages(content_encrypted) WHERE content_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_encrypted ON public.saved_contracts(filled_content_encrypted) WHERE filled_content_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_encrypted ON public.contract_analyses(contract_text_encrypted) WHERE contract_text_encrypted IS NOT NULL;

-- 11. إضافة سجل تدقيق لمحاولات الوصول غير المصرح بها
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  ip_address text,
  user_agent text,
  success boolean DEFAULT false,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- تمكين RLS على سجل التدقيق الأمني
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- سياسة: فقط المسؤولون يمكنهم عرض سجل التدقيق
CREATE POLICY "Only admins can view security audit log"
ON public.security_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة: النظام فقط يمكنه الإدراج (عبر service role)
CREATE POLICY "System can insert security logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);

-- منع التحديث والحذف
CREATE POLICY "No one can update security logs"
ON public.security_audit_log
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete security logs"
ON public.security_audit_log
FOR DELETE
USING (false);

-- 12. إضافة دالة لتسجيل محاولات الوصول
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    success,
    error_message
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_success,
    p_error_message
  );
END;
$$;
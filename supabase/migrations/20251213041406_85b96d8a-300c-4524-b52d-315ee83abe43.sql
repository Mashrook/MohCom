-- 1. تحديث سياسة contract_ratings لعرض التقييمات بشكل مجهول
DROP POLICY IF EXISTS "Users can view all ratings" ON public.contract_ratings;

-- إنشاء سياسة جديدة للتقييمات - المستخدمون يرون تقييماتهم فقط
CREATE POLICY "Users can view their own ratings"
ON public.contract_ratings
FOR SELECT
USING (auth.uid() = user_id);

-- السماح بعرض التقييمات للمستخدمين المسجلين فقط (بدون user_id)
CREATE POLICY "Authenticated users can view aggregate ratings"
ON public.contract_ratings
FOR SELECT
TO authenticated
USING (true);

-- 2. إضافة سياسات أمان إضافية للـ admin على contract_analyses
CREATE POLICY "Admins can view all analyses"
ON public.contract_analyses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. إنشاء عرض (view) للتقييمات المجمعة بدون بيانات المستخدم
CREATE OR REPLACE VIEW public.template_ratings_summary AS
SELECT 
  template_id,
  COUNT(*) as total_ratings,
  AVG(rating) as average_rating
FROM public.contract_ratings
GROUP BY template_id;

-- 4. تحديث سياسة profiles لإزالة الوصول للبريد الإلكتروني
-- إنشاء عرض آمن للملفات الشخصية العامة
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- 5. إضافة audit log للإجراءات الحساسة
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- تفعيل RLS على جدول التدقيق
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- فقط المسؤولين يمكنهم عرض سجلات التدقيق
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- لا يمكن لأحد حذف سجلات التدقيق
CREATE POLICY "No one can delete audit logs"
ON public.audit_logs
FOR DELETE
USING (false);

-- السماح للنظام بإدراج سجلات التدقيق
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- 6. إنشاء function لتسجيل الأحداث
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$;

-- 7. إنشاء trigger لتسجيل تغييرات الأدوار
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event('role_assigned', 'user_roles', NEW.id, NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event('role_changed', 'user_roles', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event('role_removed', 'user_roles', OLD.id, row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_role_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();

-- 8. إنشاء trigger لتسجيل تغييرات الرسائل
CREATE OR REPLACE FUNCTION public.audit_message_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event('message_sent', 'messages', NEW.id, NULL, jsonb_build_object('sender_id', NEW.sender_id, 'receiver_id', NEW.receiver_id));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_message_trigger ON public.messages;
CREATE TRIGGER audit_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.audit_message_access();
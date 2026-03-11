-- 1. تأمين جدول audit_logs من التعديل
-- إضافة سياسة لمنع التحديث نهائياً
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
CREATE POLICY "No one can update audit logs" 
ON public.audit_logs 
FOR UPDATE
USING (false);

-- 2. تأمين جدول security_audit_log من التعديل
-- السياسات الحالية جيدة، لكن نتأكد من وجودها
DROP POLICY IF EXISTS "No one can update security logs" ON public.security_audit_log;
CREATE POLICY "No one can update security logs" 
ON public.security_audit_log 
FOR UPDATE
USING (false);

-- 3. تحسين سياسة profiles لمنع حصاد البيانات
-- السماح فقط بمشاهدة الملفات الشخصية للمستخدمين المرتبطين
DROP POLICY IF EXISTS "Lawyers can view client profiles" ON public.profiles;

-- 4. إضافة فهرس للأمان على جداول الحساسة
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- 5. تأمين Views بإضافة security_invoker
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role);

-- 6. تأمين public_profiles view
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- 7. تأمين template_ratings_summary view
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE VIEW public.template_ratings_summary
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;
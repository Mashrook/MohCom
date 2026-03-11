-- 1. تشديد سياسة profiles لمنع حصاد البيانات
-- إزالة السياسة القديمة
DROP POLICY IF EXISTS "Authenticated users can view profiles for messaging" ON public.profiles;

-- سياسة جديدة: محادثات ثنائية الاتجاه فقط
CREATE POLICY "Users can view profiles of mutual conversations"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      -- محادثة ثنائية الاتجاه (أرسل واستقبل)
      EXISTS (
        SELECT 1 FROM messages m1
        WHERE m1.sender_id = profiles.id AND m1.receiver_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.sender_id = auth.uid() AND m2.receiver_id = profiles.id
      )
    )
  )
);

-- 2. تأمين public_profiles view بشكل أفضل
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  CASE
    WHEN auth.uid() = id THEN full_name
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN full_name
    ELSE COALESCE(SUBSTRING(full_name FROM 1 FOR 2) || '***', 'مستخدم')
  END as full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- 3. إضافة فهرس لتحسين أداء الاستعلامات الأمنية
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);

-- 4. تشديد audit_logs - منع الحذف نهائياً
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
CREATE POLICY "Audit logs are immutable - no delete"
ON public.audit_logs
FOR DELETE
USING (false);
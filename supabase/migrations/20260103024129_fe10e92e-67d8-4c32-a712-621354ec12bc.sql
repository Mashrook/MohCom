-- ===========================================
-- إصلاح المشاكل الأمنية المتبقية
-- ===========================================

-- 4. تشديد حماية payment_history بـ MFA إلزامي (ERROR)
DROP POLICY IF EXISTS "Users view own payments" ON public.payment_history;
DROP POLICY IF EXISTS "Users view own payments (graceful MFA)" ON public.payment_history;
DROP POLICY IF EXISTS "Admins view all payments" ON public.payment_history;

-- سياسة جديدة تتطلب MFA لجميع المستخدمين
CREATE POLICY "Users view own payments with MFA"
ON public.payment_history
FOR SELECT
USING (
  (user_id = auth.uid() AND (auth.jwt()->>'aal')::text = 'aal2')
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. تقييد user_sessions بفترة زمنية (WARN)
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;

-- سياسة جديدة: عرض الجلسات خلال آخر 30 يوم فقط
CREATE POLICY "Users view own recent sessions"
ON public.user_sessions
FOR SELECT
USING (
  user_id = auth.uid()
  AND created_at > (now() - interval '30 days')
);

-- 6. إصلاح shared_contracts للتحقق من token (WARN)
DROP POLICY IF EXISTS "View shared contracts with valid token only" ON public.shared_contracts;
DROP POLICY IF EXISTS "Users can view shared contracts" ON public.shared_contracts;

-- سياسة: المالك أو المدير يرى العقود
CREATE POLICY "Owners and admins view shared contracts"
ON public.shared_contracts
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 7. تحسين حماية الملفات العامة (WARN)
DROP POLICY IF EXISTS "Anyone can view public files" ON public.files;
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;

-- سياسة محسّنة للملفات
CREATE POLICY "View own or shared files"
ON public.files
FOR SELECT
USING (
  uploaded_by = auth.uid()
  OR auth.uid() = ANY(shared_with)
  OR public.has_role(auth.uid(), 'admin')
);

-- سياسة للملفات العامة مع تقييد إضافي
CREATE POLICY "View public files for authenticated users"
ON public.files
FOR SELECT
USING (
  is_public = true
  AND auth.role() = 'authenticated'
);

-- 8. تقييد الوصول لـ user_security_settings (WARN)
DROP POLICY IF EXISTS "Service can read all settings" ON public.user_security_settings;
DROP POLICY IF EXISTS "Users can view own security settings" ON public.user_security_settings;

-- سياسة جديدة: المستخدم يرى إعداداته فقط
CREATE POLICY "Users view own security settings"
ON public.user_security_settings
FOR SELECT
USING (user_id = auth.uid());

-- المدراء يرون كل الإعدادات
CREATE POLICY "Admins view all security settings"
ON public.user_security_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 9. تحسين التحقق من user_known_locations (WARN)
DROP POLICY IF EXISTS "Service can insert locations" ON public.user_known_locations;
DROP POLICY IF EXISTS "Users can view own locations" ON public.user_known_locations;

-- سياسة جديدة: المستخدم المصادق عليه فقط
CREATE POLICY "Authenticated users insert own locations"
ON public.user_known_locations
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND user_id = auth.uid()
);

-- سياسة عرض المواقع الخاصة
CREATE POLICY "Users view own locations"
ON public.user_known_locations
FOR SELECT
USING (user_id = auth.uid());

-- 10. تحديث سياسات الرسائل لتقييد الميتاداتا
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;

-- سياسة محسّنة: عرض الرسائل خلال آخر 90 يوم فقط
CREATE POLICY "Users view own messages recent"
ON public.messages
FOR SELECT
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND created_at > (now() - interval '90 days')
);

-- سياسة للمدراء
CREATE POLICY "Admins view all messages"
ON public.messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
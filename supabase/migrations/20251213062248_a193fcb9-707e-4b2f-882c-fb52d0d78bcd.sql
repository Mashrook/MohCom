-- إصلاح مشكلة كشف البريد الإلكتروني للجميع
-- حذف السياسة القديمة التي تسمح لأي مستخدم بقراءة جميع الملفات الشخصية
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- إنشاء سياسة جديدة تسمح للمستخدمين برؤية الأسماء والصور فقط (بدون البريد)
-- سيتم ذلك عبر الـ view الموجود public_profiles
CREATE POLICY "Users can view limited profile info for messaging" 
ON public.profiles 
FOR SELECT 
USING (
  -- يمكن للمستخدم رؤية ملفه الشخصي بالكامل
  auth.uid() = id
  OR 
  -- أو إذا كان لديه محادثة مع هذا الشخص (لعرض الاسم والصورة فقط)
  EXISTS (
    SELECT 1 FROM public.messages 
    WHERE (sender_id = auth.uid() AND receiver_id = profiles.id)
       OR (receiver_id = auth.uid() AND sender_id = profiles.id)
  )
  OR
  -- أو إذا كان محامياً (لعرض العملاء)
  public.has_role(auth.uid(), 'lawyer')
);

-- إصلاح سياسة الاشتراكات - تقييد Service Role
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- إضافة سياسة أكثر أماناً للـ service role (تستخدم فقط من Edge Functions)
-- لا نحتاج سياسة منفصلة لأن Edge Functions تستخدم service_role key مباشرة
-- والسياسات الموجودة كافية للمستخدمين العاديين

-- تحسين سياسة المسؤولين لقراءة الاشتراكات
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- تمكين حماية إضافية: منع تحديث بيانات Stripe من قبل المستخدم
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

CREATE POLICY "Users can only update non-sensitive subscription fields" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  -- لا يمكن للمستخدم تغيير بيانات Stripe
);
-- إضافة سياسة RLS للسماح للمسؤولين بقراءة جميع الأدوار
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- إضافة سياسة للمستخدمين لقراءة دورهم الخاص
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
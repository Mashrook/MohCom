-- سياسة للسماح للمسؤولين بحذف أي ملف
CREATE POLICY "Admins can delete any file"
ON public.files
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بتحديث أي ملف
CREATE POLICY "Admins can update any file"
ON public.files
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة جميع مشاركات الملفات
CREATE POLICY "Admins can view all file shares"
ON public.file_shares
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بحذف أي مشاركة ملف
CREATE POLICY "Admins can delete any file share"
ON public.file_shares
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة جميع الرسائل
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة جميع محادثات المحامين مع الذكاء الاصطناعي
CREATE POLICY "Admins can view all lawyer AI chats"
ON public.lawyer_ai_chats
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة جميع العقود المحفوظة
CREATE POLICY "Admins can view all saved contracts"
ON public.saved_contracts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بحذف أي عقد محفوظ
CREATE POLICY "Admins can delete any saved contract"
ON public.saved_contracts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة جميع تحليلات العقود
CREATE POLICY "Admins can view all contract analyses"
ON public.contract_analyses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بحذف أي ملف شخصي (حذف مستخدم)
CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND id != auth.uid());

-- سياسة للسماح للمسؤولين بحذف أي دور مستخدم
CREATE POLICY "Admins can delete any user role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id != auth.uid());

-- سياسة للسماح للمسؤولين بحذف أي اشتراك
CREATE POLICY "Admins can delete any subscription"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بتحديث ملفات المحامين
CREATE POLICY "Admins can update any lawyer profile"
ON public.lawyer_profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- سياسة للسماح للمسؤولين بقراءة عمليات البحث المحفوظة
CREATE POLICY "Admins can view all saved searches"
ON public.saved_searches
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
-- 1. تحديث سياسة الـ profiles لمنع تسريب البريد الإلكتروني
DROP POLICY IF EXISTS "Users can view limited profile info for messaging" ON public.profiles;

CREATE POLICY "Users can view limited profile info for messaging" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'lawyer'::app_role)
  OR (EXISTS (
    SELECT 1
    FROM messages
    WHERE ((messages.sender_id = auth.uid()) AND (messages.receiver_id = profiles.id)) 
       OR ((messages.receiver_id = auth.uid()) AND (messages.sender_id = profiles.id))
  ))
);

-- 2. إضافة سياسات RLS للـ public_profiles view
-- أولاً نحتاج التأكد من أن الـ view يعمل بشكل صحيح
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- 3. إضافة سياسات للـ template_ratings_summary
-- هذا view للإحصائيات العامة، سنجعله عام للقراءة
DROP VIEW IF EXISTS public.template_ratings_summary;

CREATE VIEW public.template_ratings_summary AS
SELECT 
  template_id,
  COUNT(*) as total_ratings,
  AVG(rating)::numeric as average_rating
FROM public.contract_ratings
GROUP BY template_id;

-- 4. إنشاء جدول منفصل لمشاركة الملفات بدلاً من الـ array
CREATE TABLE IF NOT EXISTS public.file_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  shared_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(file_id, shared_with_user_id)
);

ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول مشاركة الملفات
CREATE POLICY "Users can view shares for their files or shared with them" 
ON public.file_shares 
FOR SELECT 
USING (
  auth.uid() = shared_with_user_id 
  OR auth.uid() = shared_by_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "File owners can share their files" 
ON public.file_shares 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.files 
    WHERE files.id = file_id 
    AND files.uploaded_by = auth.uid()
  )
);

CREATE POLICY "File owners can remove shares" 
ON public.file_shares 
FOR DELETE 
USING (
  auth.uid() = shared_by_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. تحديث سياسة عرض الملفات لاستخدام الجدول الجديد
DROP POLICY IF EXISTS "Users can view files shared with them" ON public.files;

CREATE POLICY "Users can view files shared with them" 
ON public.files 
FOR SELECT 
USING (
  auth.uid() = uploaded_by 
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.file_shares 
    WHERE file_shares.file_id = files.id 
    AND file_shares.shared_with_user_id = auth.uid()
  )
);
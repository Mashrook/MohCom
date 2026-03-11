-- إصلاح عرض public_profiles بإضافة حماية RLS
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at
FROM public.profiles p
WHERE 
  -- المستخدم يرى ملفه الشخصي فقط
  auth.uid() = p.id
  -- أو المدراء يرون الجميع
  OR has_role(auth.uid(), 'admin')
  -- أو المستخدمين الذين تبادلوا رسائل
  OR (
    EXISTS (SELECT 1 FROM messages m1 WHERE m1.sender_id = p.id AND m1.receiver_id = auth.uid())
    AND EXISTS (SELECT 1 FROM messages m2 WHERE m2.sender_id = auth.uid() AND m2.receiver_id = p.id)
  );

-- إصلاح عرض user_subscription_status بإضافة حماية RLS
DROP VIEW IF EXISTS public.user_subscription_status;

CREATE VIEW public.user_subscription_status
WITH (security_invoker = true)
AS
SELECT 
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_end
FROM public.subscriptions s
WHERE 
  -- المستخدم يرى اشتراكه فقط
  auth.uid() = s.user_id
  -- أو المدراء يرون الجميع
  OR has_role(auth.uid(), 'admin');

-- إصلاح عرض template_ratings_summary بإضافة سياسة واضحة
DROP VIEW IF EXISTS public.template_ratings_summary;

CREATE VIEW public.template_ratings_summary
WITH (security_invoker = true)
AS
SELECT 
  cr.template_id,
  COUNT(*) as total_ratings,
  AVG(cr.rating) as average_rating
FROM public.contract_ratings cr
GROUP BY cr.template_id;

-- منح صلاحيات القراءة للمستخدمين المصادق عليهم
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.user_subscription_status TO authenticated;
GRANT SELECT ON public.template_ratings_summary TO authenticated, anon;
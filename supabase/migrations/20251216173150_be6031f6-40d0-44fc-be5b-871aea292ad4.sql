-- Create blog_posts table for legal blog
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES public.profiles(id),
  category TEXT DEFAULT 'عام',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (is_published = true);

-- Admins can manage all posts
CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Lawyers can create and manage their own posts
CREATE POLICY "Lawyers can create blog posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'lawyer'::app_role) AND auth.uid() = author_id);

CREATE POLICY "Lawyers can update their own posts"
ON public.blog_posts
FOR UPDATE
USING (has_role(auth.uid(), 'lawyer'::app_role) AND auth.uid() = author_id);

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample blog posts for SEO
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, is_published, published_at) VALUES
('دليلك الشامل لفهم نظام العمل السعودي', 'labor-law-guide', 'تعرف على أهم أحكام نظام العمل في المملكة العربية السعودية وحقوق الموظفين وأصحاب العمل.', E'# دليلك الشامل لفهم نظام العمل السعودي\n\nيعد نظام العمل السعودي من أهم الأنظمة التي تنظم العلاقة بين العامل وصاحب العمل في المملكة العربية السعودية.\n\n## حقوق العامل الأساسية\n\n- الحصول على أجر عادل\n- الإجازات السنوية\n- التأمين الصحي\n- نهاية الخدمة\n\n## واجبات صاحب العمل\n\n- توفير بيئة عمل آمنة\n- دفع الأجور في موعدها\n- الالتزام بساعات العمل المحددة\n\n## الفصل التعسفي\n\nيحق للعامل الحصول على تعويض في حالة الفصل التعسفي وفقاً للمادة 77 من نظام العمل.', 'قانون العمل', ARRAY['نظام العمل', 'حقوق الموظفين', 'السعودية'], true, now()),

('كيف تحمي حقوقك كمستأجر في السعودية', 'tenant-rights-guide', 'دليل شامل لحقوق المستأجر والتزامات المؤجر وفقاً لنظام الإيجار السعودي.', E'# كيف تحمي حقوقك كمستأجر في السعودية\n\nمعرفة حقوقك كمستأجر أمر ضروري لتجنب المشاكل القانونية.\n\n## حقوق المستأجر\n\n- الحصول على عقد إيجار موثق\n- الصيانة الدورية للعقار\n- استرداد التأمين عند انتهاء العقد\n\n## التزامات المستأجر\n\n- دفع الإيجار في موعده\n- المحافظة على العقار\n- إبلاغ المؤجر عن أي أضرار\n\n## نصائح هامة\n\nاحرص دائماً على توثيق عقد الإيجار عبر منصة إيجار الإلكترونية لضمان حقوقك.', 'قانون العقارات', ARRAY['الإيجار', 'حقوق المستأجر', 'العقارات'], true, now()),

('إجراءات تأسيس الشركات في المملكة العربية السعودية', 'company-registration-guide', 'خطوات تأسيس شركتك في السعودية من الألف إلى الياء مع كافة المتطلبات القانونية.', E'# إجراءات تأسيس الشركات في المملكة العربية السعودية\n\nتأسيس شركة في السعودية أصبح أسهل من أي وقت مضى مع رؤية 2030.\n\n## أنواع الشركات\n\n1. شركة ذات مسؤولية محدودة\n2. شركة مساهمة\n3. مؤسسة فردية\n4. شركة تضامن\n\n## خطوات التأسيس\n\n1. اختيار اسم تجاري\n2. حجز الاسم التجاري\n3. إعداد عقد التأسيس\n4. توثيق العقد\n5. استخراج السجل التجاري\n\n## المستندات المطلوبة\n\n- بطاقة الهوية الوطنية\n- عقد التأسيس\n- إثبات العنوان\n\nتواصل معنا للحصول على استشارة مجانية حول تأسيس شركتك.', 'قانون الشركات', ARRAY['تأسيس الشركات', 'السجل التجاري', 'ريادة الأعمال'], true, now());
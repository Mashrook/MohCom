-- Create contract templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  downloads_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  ratings_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contract ratings table
CREATE TABLE public.contract_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Create user downloads tracking
CREATE TABLE public.contract_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_downloads ENABLE ROW LEVEL SECURITY;

-- Contract templates policies (public read)
CREATE POLICY "Anyone can view contract templates"
ON public.contract_templates
FOR SELECT
USING (true);

-- Contract ratings policies
CREATE POLICY "Users can view all ratings"
ON public.contract_ratings
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own ratings"
ON public.contract_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
ON public.contract_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
ON public.contract_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Contract downloads policies
CREATE POLICY "Users can view their own downloads"
ON public.contract_downloads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own downloads"
ON public.contract_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to update average rating
CREATE OR REPLACE FUNCTION public.update_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contract_templates
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM public.contract_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    ratings_count = (
      SELECT COUNT(*) 
      FROM public.contract_ratings 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for rating updates
CREATE TRIGGER update_template_rating_on_change
AFTER INSERT OR UPDATE OR DELETE ON public.contract_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_template_rating();

-- Insert sample contract templates
INSERT INTO public.contract_templates (title, description, category, content, downloads_count, average_rating, ratings_count) VALUES
('عقد عمل محدد المدة', 'عقد عمل نموذجي محدد المدة وفقاً لنظام العمل السعودي', 'عقود العمل', 'عقد عمل محدد المدة

الطرف الأول (صاحب العمل): ________________
الطرف الثاني (العامل): ________________

المادة الأولى: مدة العقد
يبدأ هذا العقد من تاريخ ___/___/_______ وينتهي في ___/___/_______

المادة الثانية: طبيعة العمل
يعمل الطرف الثاني بوظيفة ________________

المادة الثالثة: الأجر
يتقاضى الطرف الثاني أجراً شهرياً قدره ________ ريال سعودي

المادة الرابعة: ساعات العمل
________ ساعات يومياً

المادة الخامسة: الإجازات
وفقاً لنظام العمل السعودي

التوقيعات:
الطرف الأول: ________________
الطرف الثاني: ________________', 1250, 4.8, 45),

('عقد إيجار سكني', 'عقد إيجار موحد للعقارات السكنية معتمد من وزارة الإسكان', 'عقود الإيجار', 'عقد إيجار سكني موحد

المؤجر: ________________
المستأجر: ________________
العقار: ________________

مدة الإيجار: من ___/___/_______ إلى ___/___/_______
قيمة الإيجار السنوي: ________ ريال سعودي

شروط وأحكام:
1. يلتزم المستأجر بالحفاظ على العين المؤجرة
2. يلتزم المستأجر بسداد الإيجار في مواعيده
3. لا يحق للمستأجر التأجير من الباطن

التوقيعات', 980, 4.9, 38),

('عقد بيع عقار', 'عقد بيع عقار شامل مع كافة الضمانات القانونية', 'عقود البيع', 'عقد بيع عقار

البائع: ________________
المشتري: ________________

العقار المبيع:
النوع: ________________
الموقع: ________________
المساحة: ________ متر مربع
رقم الصك: ________________

ثمن البيع: ________ ريال سعودي

طريقة السداد:
________________

الضمانات والتعهدات:
________________

التوقيعات', 750, 4.7, 28),

('عقد شراكة تجارية', 'عقد شراكة بين طرفين أو أكثر لتأسيس مشروع تجاري', 'عقود الشراكة', 'عقد شراكة تجارية

الشريك الأول: ________________
الشريك الثاني: ________________

اسم المشروع: ________________
رأس المال: ________ ريال سعودي

نسبة المشاركة:
الشريك الأول: ________%
الشريك الثاني: ________%

الإدارة والصلاحيات:
________________

توزيع الأرباح والخسائر:
________________

التوقيعات', 620, 4.6, 22),

('عقد تقديم خدمات', 'عقد لتقديم خدمات استشارية أو تقنية أو غيرها', 'عقود الخدمات', 'عقد تقديم خدمات

مقدم الخدمة: ________________
العميل: ________________

وصف الخدمات:
________________

مدة التنفيذ: ________________

المقابل المالي: ________ ريال سعودي

شروط الدفع:
________________

الالتزامات:
________________

التوقيعات', 540, 4.8, 19),

('عقد عمل غير محدد المدة', 'عقد عمل دائم وفقاً لنظام العمل السعودي', 'عقود العمل', 'عقد عمل غير محدد المدة

الطرف الأول (صاحب العمل): ________________
الطرف الثاني (العامل): ________________

يبدأ هذا العقد من تاريخ ___/___/_______

المسمى الوظيفي: ________________
الراتب الشهري: ________ ريال سعودي

البدلات:
- بدل سكن: ________
- بدل نقل: ________

فترة التجربة: 90 يوماً

التوقيعات', 890, 4.7, 35),

('عقد وكالة تجارية', 'عقد وكالة حصرية أو غير حصرية لتوزيع المنتجات', 'عقود الوكالات', 'عقد وكالة تجارية

الموكل: ________________
الوكيل: ________________

نوع الوكالة: حصرية / غير حصرية
المنطقة الجغرافية: ________________

المنتجات/الخدمات:
________________

مدة الوكالة: ________________

العمولة: ________%

التوقيعات', 420, 4.5, 15),

('عقد توريد', 'عقد توريد بضائع أو مواد بين المورد والمشتري', 'عقود التوريد', 'عقد توريد

المورد: ________________
المشتري: ________________

البضائع/المواد:
________________

الكمية: ________________
السعر الإجمالي: ________ ريال سعودي

مواعيد التسليم:
________________

شروط الضمان:
________________

التوقيعات', 380, 4.6, 12);
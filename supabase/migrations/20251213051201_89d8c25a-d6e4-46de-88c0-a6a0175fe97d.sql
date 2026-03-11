-- Create table for section/service visibility settings
CREATE TABLE public.section_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  section_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.section_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view section settings (needed for frontend to check visibility)
CREATE POLICY "Anyone can view section settings"
ON public.section_settings
FOR SELECT
USING (true);

-- Only admins can manage section settings
CREATE POLICY "Admins can manage section settings"
ON public.section_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_section_settings_updated_at
BEFORE UPDATE ON public.section_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections
INSERT INTO public.section_settings (section_key, section_name, is_enabled, display_order) VALUES
  ('hero', 'القسم الرئيسي (Hero)', true, 1),
  ('services', 'قسم الخدمات', true, 2),
  ('features', 'قسم المميزات', true, 3),
  ('video', 'قسم الفيديو', true, 4),
  ('cta', 'قسم الدعوة للتسجيل', true, 5),
  ('consultation', 'خدمة الاستشارات القانونية', true, 10),
  ('predictions', 'خدمة التنبؤ بالأحكام', true, 11),
  ('complaints', 'خدمة الشكاوى الذكية', true, 12),
  ('contracts', 'خدمة العقود', true, 13),
  ('lawyers', 'خدمة التواصل مع المحامين', true, 14),
  ('legal_search', 'خدمة البحث القانوني', true, 15);
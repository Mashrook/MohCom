
-- Risk Assessments table
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_title text NOT NULL,
  case_description text,
  category text NOT NULL DEFAULT 'عام',
  jurisdiction text NOT NULL DEFAULT 'المملكة العربية السعودية',
  score integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'LOW' CHECK (level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis text,
  ai_confidence float DEFAULT 0,
  risk_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.risk_assessments(user_id, created_at DESC);

-- Risk Configurations table (admin-editable scoring weights)
CREATE TABLE IF NOT EXISTS public.risk_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_name text NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_configurations ENABLE ROW LEVEL SECURITY;

-- RLS for risk_assessments
CREATE POLICY "Users can view own risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own risk assessments"
  ON public.risk_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own risk assessments"
  ON public.risk_assessments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all risk assessments"
  ON public.risk_assessments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for risk_configurations
CREATE POLICY "Authenticated can view risk configs"
  ON public.risk_configurations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage risk configs"
  ON public.risk_configurations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default scoring configurations
INSERT INTO public.risk_configurations (config_key, config_name, config_value, description) VALUES
  ('category_weights', 'أوزان الفئات', '{"جنائي":70,"نزاع مالي كبير":50,"إنهاء خدمات":30,"صياغة عقود":15,"_default":10}'::jsonb, 'أوزان المخاطر حسب فئة القضية'),
  ('party_weights', 'أوزان الأطراف', '{"حكومي":25,"شركة_عامة":25,"أطراف_متعددة":10}'::jsonb, 'أوزان المخاطر حسب نوع الأطراف'),
  ('ai_weights', 'أوزان الذكاء الاصطناعي', '{"ثقة_منخفضة":20,"اقتباسات_مفقودة":15,"اقتباسات_غير_صحيحة":20,"بيانات_شخصية":10,"هلوسة":30,"فشل_تحليل":20}'::jsonb, 'أوزان أعلام المخاطر من تحليل AI'),
  ('risk_thresholds', 'حدود المخاطر', '{"LOW":0,"MEDIUM":25,"HIGH":50,"CRITICAL":75}'::jsonb, 'حدود مستويات المخاطر (0-100)')
ON CONFLICT (config_key) DO NOTHING;

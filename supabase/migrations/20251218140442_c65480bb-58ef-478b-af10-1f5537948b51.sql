-- Create terms consent tracking table
CREATE TABLE public.terms_consent_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  privacy_version VARCHAR(20) NOT NULL,
  consent_type VARCHAR(50) NOT NULL DEFAULT 'signup',
  ip_address VARCHAR(45),
  user_agent TEXT,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terms versions table to track current versions
CREATE TABLE public.terms_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  summary_ar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(document_type, version)
);

-- Enable RLS
ALTER TABLE public.terms_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for terms_consent_log
CREATE POLICY "Users can view their own consent records"
  ON public.terms_consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consent"
  ON public.terms_consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all consent records"
  ON public.terms_consent_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for terms_versions (public read, admin write)
CREATE POLICY "Anyone can view terms versions"
  ON public.terms_versions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage terms versions"
  ON public.terms_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert initial versions
INSERT INTO public.terms_versions (document_type, version, effective_date, summary_ar)
VALUES 
  ('terms', '1.0', '2024-12-01', 'الإصدار الأول من شروط الاستخدام'),
  ('privacy', '1.0', '2024-12-01', 'الإصدار الأول من سياسة الخصوصية');

-- Create index for faster lookups
CREATE INDEX idx_terms_consent_user_id ON public.terms_consent_log(user_id);
CREATE INDEX idx_terms_versions_type ON public.terms_versions(document_type);
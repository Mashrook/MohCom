-- جدول التوقيعات المحفوظة
CREATE TABLE public.saved_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('draw', 'type', 'upload')),
  signature_data TEXT NOT NULL,
  font_family TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول قوالب المستخدمين المخصصة
CREATE TABLE public.user_contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  sector TEXT DEFAULT 'عام',
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول العقود المشاركة
CREATE TABLE public.shared_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contract_id UUID REFERENCES public.saved_contracts(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_contracts ENABLE ROW LEVEL SECURITY;

-- سياسات التوقيعات
CREATE POLICY "Users can view own signatures" ON public.saved_signatures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own signatures" ON public.saved_signatures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signatures" ON public.saved_signatures
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signatures" ON public.saved_signatures
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات قوالب المستخدمين
CREATE POLICY "Users can view own templates" ON public.user_contract_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own templates" ON public.user_contract_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.user_contract_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.user_contract_templates
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات العقود المشاركة
CREATE POLICY "Users can view own shared contracts" ON public.shared_contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view by token" ON public.shared_contracts
  FOR SELECT USING (true);

CREATE POLICY "Users can create shared contracts" ON public.shared_contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared contracts" ON public.shared_contracts
  FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_saved_signatures_updated_at
  BEFORE UPDATE ON public.saved_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_contract_templates_updated_at
  BEFORE UPDATE ON public.user_contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
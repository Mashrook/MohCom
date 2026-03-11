-- Create table for call logs (admin oversight)
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'video', -- 'video' or 'voice'
  room_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'connected', 'ended', 'missed'
  caller_ip TEXT,
  receiver_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own call logs
CREATE POLICY "Users can insert their own call logs"
ON public.call_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

-- Allow users to update their own calls (to end them)
CREATE POLICY "Users can update their own calls"
ON public.call_logs
FOR UPDATE
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Allow users to view their own calls
CREATE POLICY "Users can view their own calls"
ON public.call_logs
FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Allow admins to view all call logs for oversight
CREATE POLICY "Admins can view all call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin message oversight policy (allow admins to read all messages)
CREATE POLICY "Admins can view all messages for oversight"
ON public.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create API keys management table for admin
CREATE TABLE public.admin_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  key_category TEXT NOT NULL, -- 'ai', 'payment', 'rtc', 'storage', 'other'
  display_name TEXT NOT NULL,
  description TEXT,
  is_configured BOOLEAN DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.admin_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage API keys
CREATE POLICY "Admins can manage API keys"
ON public.admin_api_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default API key entries
INSERT INTO public.admin_api_keys (key_name, key_category, display_name, description, is_configured) VALUES
('GOOGLE_GEMINI_API_KEY', 'ai', 'Google Gemini AI', 'مفتاح الذكاء الاصطناعي للاستشارات والتنبؤات', true),
('PERPLEXITY_API_KEY', 'ai', 'Perplexity Search', 'مفتاح البحث القانوني والشكاوى', true),
('MOYASAR_SECRET_KEY', 'payment', 'Moyasar Payment', 'مفتاح بوابة الدفع الرئيسية', true),
('TAP_SECRET_KEY', 'payment', 'Tap Payments', 'مفتاح بوابة الدفع البديلة', true),
('STRIPE_SECRET_KEY', 'payment', 'Stripe', 'مفتاح بوابة الدفع العالمية', true),
('JITSI_APP_ID', 'rtc', 'Jitsi App ID', 'معرف تطبيق الاتصال المرئي', true),
('JITSI_PRIVATE_KEY', 'rtc', 'Jitsi Private Key', 'المفتاح الخاص للاتصال المرئي', true),
('DAILY_API_KEY', 'rtc', 'Daily.co API', 'مفتاح خدمة الاتصال البديلة', true),
('RESEND_API_KEY', 'other', 'Resend Email', 'مفتاح خدمة البريد الإلكتروني', true),
('MAPBOX_PUBLIC_TOKEN', 'other', 'Mapbox', 'رمز الخرائط', true);

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
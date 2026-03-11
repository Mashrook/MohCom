
-- Add ios_product_id to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS ios_product_id text UNIQUE;

-- Add source and source_ref to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'moyasar';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS source_ref text;

-- Update existing plans with iOS product IDs
UPDATE public.subscription_plans SET ios_product_id = 'com.mohamie.ios.month' WHERE code = 'personal_monthly';
UPDATE public.subscription_plans SET ios_product_id = 'com.mohamie.ios.year' WHERE code = 'personal_yearly';
UPDATE public.subscription_plans SET ios_product_id = 'com.mohamiea.ios.month' WHERE code = 'company_monthly';
UPDATE public.subscription_plans SET ios_product_id = 'com.mohamiea.ios.year' WHERE code = 'company_yearly';

-- RLS policies for subscription_plans (public read for authenticated)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active plans" ON public.subscription_plans
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS policies for subscriptions (user can only see own)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for payments (user can only see own)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- No client-side inserts allowed - only service_role via edge functions
-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_source ON public.subscriptions(source);
CREATE INDEX IF NOT EXISTS idx_plans_ios_product_id ON public.subscription_plans(ios_product_id);

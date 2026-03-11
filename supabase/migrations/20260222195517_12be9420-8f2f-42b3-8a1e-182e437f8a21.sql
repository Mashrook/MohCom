
-- ===== 1. Create subscription_plans table =====
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  period text NOT NULL CHECK (period IN ('month', 'year')),
  duration_days int NOT NULL,
  price_halala int NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== 2. Create payments table =====
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  provider text NOT NULL DEFAULT 'moyasar',
  provider_payment_id text UNIQUE,
  amount_halala int NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL CHECK (status IN ('initiated', 'paid', 'failed', 'refunded')),
  method text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_payments_user_created ON public.payments(user_id, created_at DESC);

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role inserts (edge functions)
CREATE POLICY "Service role can manage payments"
  ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== 3. Alter existing subscriptions table =====
-- Add plan_id column referencing subscription_plans
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id);

-- Add started_at and ends_at columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Add status check constraint (if not exists)
-- First drop old constraint if any, then add new one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_status_check_v2'
  ) THEN
    ALTER TABLE public.subscriptions
      DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_status_check_v2
      CHECK (status IN ('active', 'expired', 'canceled', 'inactive'));
  END IF;
END $$;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_ends ON public.subscriptions(user_id, ends_at DESC);

-- ===== 4. Seed static plans into subscription_plans =====
INSERT INTO public.subscription_plans (code, name, period, duration_days, price_halala, currency, is_active) VALUES
  ('personal_monthly', 'الباقة الشخصية (شهري)', 'month', 30, 5900, 'SAR', true),
  ('personal_yearly', 'الباقة الشخصية (سنوي)', 'year', 365, 59900, 'SAR', true),
  ('company_monthly', 'باقة الشركات (شهري)', 'month', 30, 9900, 'SAR', true),
  ('company_yearly', 'باقة الشركات (سنوي)', 'year', 365, 89900, 'SAR', true)
ON CONFLICT (code) DO NOTHING;

-- ===== 5. Trigger for updated_at on payments =====
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

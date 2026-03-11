-- Create payment errors log table
CREATE TABLE public.payment_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_code TEXT,
  error_message TEXT NOT NULL,
  payment_method TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'SAR',
  tap_charge_id TEXT,
  request_payload JSONB,
  response_payload JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_errors ENABLE ROW LEVEL SECURITY;

-- Only admins can view payment errors
CREATE POLICY "Only admins can view payment errors"
ON public.payment_errors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert (from webhook)
CREATE POLICY "Only service role can insert payment errors"
ON public.payment_errors
FOR INSERT
WITH CHECK (current_setting('role'::text, true) = 'service_role'::text);

-- No one can update or delete
CREATE POLICY "No one can update payment errors"
ON public.payment_errors
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete payment errors"
ON public.payment_errors
FOR DELETE
USING (false);

-- Create index for faster queries
CREATE INDEX idx_payment_errors_created_at ON public.payment_errors(created_at DESC);
CREATE INDEX idx_payment_errors_user_id ON public.payment_errors(user_id);
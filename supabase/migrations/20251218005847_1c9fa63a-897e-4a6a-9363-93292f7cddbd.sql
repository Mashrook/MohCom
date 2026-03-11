-- Create payment history table
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  tap_charge_id TEXT,
  tap_receipt_id TEXT,
  plan_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "Users can view their own payments"
ON public.payment_history
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all payment history
CREATE POLICY "Admins can view all payments"
ON public.payment_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert payments (from webhook)
CREATE POLICY "Service role can insert payments"
ON public.payment_history
FOR INSERT
WITH CHECK (auth.uid() = user_id OR current_setting('role'::text) = 'service_role'::text);

-- Create index for faster queries
CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
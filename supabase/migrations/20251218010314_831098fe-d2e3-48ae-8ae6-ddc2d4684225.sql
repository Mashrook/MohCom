-- Fix payment_history INSERT policy to be more secure
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payment_history;

-- Only allow inserts from webhook (service role) - remove user self-insert
CREATE POLICY "Only service role can insert payments"
ON public.payment_history
FOR INSERT
WITH CHECK (current_setting('role'::text, true) = 'service_role');

-- Add UPDATE restriction
CREATE POLICY "No one can update payment history"
ON public.payment_history
FOR UPDATE
USING (false);

-- Add DELETE restriction  
CREATE POLICY "No one can delete payment history"
ON public.payment_history
FOR DELETE
USING (false);
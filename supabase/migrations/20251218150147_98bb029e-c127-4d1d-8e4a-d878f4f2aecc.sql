-- Drop existing SELECT policies for contract_templates
DROP POLICY IF EXISTS "Anyone can view free contract templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Subscribed users can view premium templates" ON public.contract_templates;

-- Create new policy that allows anyone (including anonymous) to view free templates
CREATE POLICY "Anyone can view free templates" 
ON public.contract_templates 
FOR SELECT 
USING (is_premium = false OR is_premium IS NULL);

-- Create policy for premium templates - requires subscription or admin/lawyer role
CREATE POLICY "Subscribers can view premium templates" 
ON public.contract_templates 
FOR SELECT 
USING (
  is_premium = true 
  AND (
    EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE subscriptions.user_id = auth.uid() 
      AND subscriptions.status = 'active'
    )
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'lawyer')
  )
);
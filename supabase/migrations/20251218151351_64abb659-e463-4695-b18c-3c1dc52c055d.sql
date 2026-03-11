-- Drop the restrictive policies we created
DROP POLICY IF EXISTS "Anyone can view free templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Subscribers can view premium templates" ON public.contract_templates;

-- Create PERMISSIVE policies (default, allows OR logic between policies)
CREATE POLICY "Public can view free templates" 
ON public.contract_templates 
FOR SELECT 
TO public
USING (is_premium = false OR is_premium IS NULL);

CREATE POLICY "Subscribers admins lawyers can view premium templates" 
ON public.contract_templates 
FOR SELECT 
TO authenticated
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
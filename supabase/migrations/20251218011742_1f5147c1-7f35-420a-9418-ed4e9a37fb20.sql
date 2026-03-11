-- Add AAL2 (MFA) restrictive policies for sensitive tables

-- Payment History - requires MFA for all operations
CREATE POLICY "Require MFA for payment history access"
ON public.payment_history
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');

-- Messages - requires MFA for all operations  
CREATE POLICY "Require MFA for messages access"
ON public.messages
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');

-- Contract Analyses - requires MFA for all operations
CREATE POLICY "Require MFA for contract analyses access"
ON public.contract_analyses
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');

-- Saved Contracts - requires MFA for all operations
CREATE POLICY "Require MFA for saved contracts access"
ON public.saved_contracts
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');

-- Lawyer AI Chats - requires MFA for all operations
CREATE POLICY "Require MFA for lawyer ai chats access"
ON public.lawyer_ai_chats
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');

-- Subscriptions - requires MFA for all operations
CREATE POLICY "Require MFA for subscriptions access"
ON public.subscriptions
AS RESTRICTIVE
TO authenticated
USING ((select auth.jwt()->>'aal') = 'aal2');
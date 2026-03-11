-- Drop existing strict AAL2 policies
DROP POLICY IF EXISTS "Require MFA for payment history access" ON public.payment_history;
DROP POLICY IF EXISTS "Require MFA for messages access" ON public.messages;
DROP POLICY IF EXISTS "Require MFA for contract analyses access" ON public.contract_analyses;
DROP POLICY IF EXISTS "Require MFA for saved contracts access" ON public.saved_contracts;
DROP POLICY IF EXISTS "Require MFA for lawyer ai chats access" ON public.lawyer_ai_chats;
DROP POLICY IF EXISTS "Require MFA for subscriptions access" ON public.subscriptions;

-- Create graceful AAL policies - existing users can use AAL1 or AAL2, new users require AAL2

-- Payment History
CREATE POLICY "Graceful MFA for payment history"
ON public.payment_history
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);

-- Messages
CREATE POLICY "Graceful MFA for messages"
ON public.messages
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);

-- Contract Analyses
CREATE POLICY "Graceful MFA for contract analyses"
ON public.contract_analyses
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);

-- Saved Contracts
CREATE POLICY "Graceful MFA for saved contracts"
ON public.saved_contracts
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);

-- Lawyer AI Chats
CREATE POLICY "Graceful MFA for lawyer ai chats"
ON public.lawyer_ai_chats
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);

-- Subscriptions
CREATE POLICY "Graceful MFA for subscriptions"
ON public.subscriptions
AS RESTRICTIVE
TO authenticated
USING (
  array[(select auth.jwt()->>'aal')] <@ (
    select
      case
        when created_at >= '2025-12-18T00:00:00Z' then array['aal2']
        else array['aal1', 'aal2']
      end as aal
    from auth.users
    where (select auth.uid()) = id
  )
);
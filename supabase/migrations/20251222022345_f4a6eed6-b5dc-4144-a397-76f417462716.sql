-- Add admin policies for additional tables that may need them

-- Check and add policy for admin to view all saved_searches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all saved searches' AND tablename = 'saved_searches'
  ) THEN
    CREATE POLICY "Admins can view all saved searches" ON public.saved_searches
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to delete saved_searches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete saved searches' AND tablename = 'saved_searches'
  ) THEN
    CREATE POLICY "Admins can delete saved searches" ON public.saved_searches
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to view all support_chats
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all support chats' AND tablename = 'support_chats'
  ) THEN
    CREATE POLICY "Admins can view all support chats" ON public.support_chats
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to delete support_chats
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete support chats' AND tablename = 'support_chats'
  ) THEN
    CREATE POLICY "Admins can delete support chats" ON public.support_chats
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to view all payment_history
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all payment history' AND tablename = 'payment_history'
  ) THEN
    CREATE POLICY "Admins can view all payment history" ON public.payment_history
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to view all contract_analyses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all contract analyses' AND tablename = 'contract_analyses'
  ) THEN
    CREATE POLICY "Admins can view all contract analyses" ON public.contract_analyses
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to delete contract_analyses  
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete contract analyses' AND tablename = 'contract_analyses'
  ) THEN
    CREATE POLICY "Admins can delete contract analyses" ON public.contract_analyses
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to manage user_contract_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all user templates' AND tablename = 'user_contract_templates'
  ) THEN
    CREATE POLICY "Admins can view all user templates" ON public.user_contract_templates
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete user templates' AND tablename = 'user_contract_templates'
  ) THEN
    CREATE POLICY "Admins can delete user templates" ON public.user_contract_templates
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add policy for admin to manage service_trials
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all service trials' AND tablename = 'service_trials'
  ) THEN
    CREATE POLICY "Admins can view all service trials" ON public.service_trials
    FOR SELECT TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete service trials' AND tablename = 'service_trials'
  ) THEN
    CREATE POLICY "Admins can delete service trials" ON public.service_trials
    FOR DELETE TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
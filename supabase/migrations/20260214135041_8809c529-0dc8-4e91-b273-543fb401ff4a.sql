
-- ===================================================================
-- Fix broken encryption triggers after plaintext column removal
-- Replace with direct-encryption approach using RPC
-- ===================================================================

-- 1. Drop broken encryption triggers (reference nonexistent plaintext columns)
DROP TRIGGER IF EXISTS encrypt_contract_analyses_trigger ON public.contract_analyses;
DROP TRIGGER IF EXISTS clear_analysis_plaintext ON public.contract_analyses;
DROP TRIGGER IF EXISTS encrypt_messages_trigger ON public.messages;
DROP TRIGGER IF EXISTS clear_message_plaintext ON public.messages;
DROP TRIGGER IF EXISTS encrypt_saved_contracts_trigger ON public.saved_contracts;
DROP TRIGGER IF EXISTS clear_contract_plaintext ON public.saved_contracts;
DROP TRIGGER IF EXISTS encrypt_tap_ids_trigger ON public.payment_history;
DROP TRIGGER IF EXISTS clear_payment_plaintext ON public.payment_history;
DROP TRIGGER IF EXISTS encrypt_lawyer_chats ON public.lawyer_ai_chats;
DROP TRIGGER IF EXISTS clear_lawyer_chat_plaintext ON public.lawyer_ai_chats;

-- 2. Create a generic RPC for encrypting data before insert
-- This replaces the trigger-based approach since plaintext columns are removed
CREATE OR REPLACE FUNCTION public.insert_encrypted_message(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT,
  p_file_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Verify sender is the authenticated user
  IF auth.uid() != p_sender_id THEN
    RAISE EXCEPTION 'Unauthorized: sender must be authenticated user';
  END IF;
  
  INSERT INTO public.messages (sender_id, receiver_id, content_encrypted, file_id)
  VALUES (
    p_sender_id,
    p_receiver_id,
    CASE WHEN p_content IS NOT NULL AND p_content != '' 
      THEN encrypt_sensitive_data(p_content) 
      ELSE NULL 
    END,
    p_file_id
  )
  RETURNING id INTO v_id;
  
  -- Audit log
  INSERT INTO public.security_audit_log (user_id, action, resource_type, resource_id, success)
  VALUES (auth.uid(), 'message_sent', 'messages', v_id::text, true);
  
  RETURN v_id;
END;
$$;

-- 3. Create RPC for inserting encrypted contract analysis
CREATE OR REPLACE FUNCTION public.insert_encrypted_analysis(
  p_title TEXT,
  p_contract_text TEXT,
  p_analysis_type TEXT,
  p_summary TEXT,
  p_risks TEXT[] DEFAULT NULL,
  p_suggestions TEXT[] DEFAULT NULL,
  p_legal_references TEXT[] DEFAULT NULL,
  p_overall_rating INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.contract_analyses (
    user_id, title, contract_text_encrypted, analysis_type,
    summary, risks, suggestions, legal_references, overall_rating
  )
  VALUES (
    auth.uid(),
    p_title,
    CASE WHEN p_contract_text IS NOT NULL AND p_contract_text != ''
      THEN encrypt_sensitive_data(p_contract_text)
      ELSE NULL
    END,
    p_analysis_type,
    p_summary,
    p_risks,
    p_suggestions,
    p_legal_references,
    p_overall_rating
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 4. Create RPC for inserting encrypted saved contract
CREATE OR REPLACE FUNCTION public.insert_encrypted_saved_contract(
  p_title TEXT,
  p_template_id UUID DEFAULT NULL,
  p_field_values JSONB DEFAULT '{}'::JSONB,
  p_filled_content TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.saved_contracts (
    user_id, title, template_id, field_values, filled_content_encrypted
  )
  VALUES (
    auth.uid(),
    p_title,
    p_template_id,
    p_field_values,
    CASE WHEN p_filled_content IS NOT NULL AND p_filled_content != ''
      THEN encrypt_sensitive_data(p_filled_content)
      ELSE NULL
    END
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

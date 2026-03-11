-- Clean up existing plaintext data where encrypted versions exist

-- Messages table
UPDATE public.messages 
SET content = '[encrypted]'
WHERE content IS NOT NULL 
  AND content != '[encrypted]'
  AND content != ''
  AND content_encrypted IS NOT NULL;

-- Saved contracts table
UPDATE public.saved_contracts 
SET filled_content = '[encrypted]'
WHERE filled_content IS NOT NULL 
  AND filled_content != '[encrypted]'
  AND filled_content_encrypted IS NOT NULL;

-- Contract analyses table
UPDATE public.contract_analyses 
SET contract_text = '[encrypted]'
WHERE contract_text IS NOT NULL 
  AND contract_text != '[encrypted]'
  AND contract_text_encrypted IS NOT NULL;

-- Lawyer AI chats table
UPDATE public.lawyer_ai_chats 
SET messages = '[]'::jsonb
WHERE messages IS NOT NULL 
  AND messages != '[]'::jsonb
  AND messages_encrypted IS NOT NULL;

-- Create trigger function to clear message plaintext after encryption
CREATE OR REPLACE FUNCTION public.clear_message_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content_encrypted IS NOT NULL THEN
    NEW.content := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function to clear contract plaintext after encryption
CREATE OR REPLACE FUNCTION public.clear_contract_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.filled_content_encrypted IS NOT NULL THEN
    NEW.filled_content := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function to clear analysis plaintext after encryption
CREATE OR REPLACE FUNCTION public.clear_analysis_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_text_encrypted IS NOT NULL THEN
    NEW.contract_text := '[encrypted]';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger function to clear lawyer chat plaintext after encryption
CREATE OR REPLACE FUNCTION public.clear_lawyer_chat_plaintext_after_encryption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.messages_encrypted IS NOT NULL THEN
    NEW.messages := '[]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS clear_message_plaintext ON public.messages;
CREATE TRIGGER clear_message_plaintext
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_message_plaintext_after_encryption();

DROP TRIGGER IF EXISTS clear_contract_plaintext ON public.saved_contracts;
CREATE TRIGGER clear_contract_plaintext
  BEFORE INSERT OR UPDATE ON public.saved_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_contract_plaintext_after_encryption();

DROP TRIGGER IF EXISTS clear_analysis_plaintext ON public.contract_analyses;
CREATE TRIGGER clear_analysis_plaintext
  BEFORE INSERT OR UPDATE ON public.contract_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_analysis_plaintext_after_encryption();

DROP TRIGGER IF EXISTS clear_lawyer_chat_plaintext ON public.lawyer_ai_chats;
CREATE TRIGGER clear_lawyer_chat_plaintext
  BEFORE INSERT OR UPDATE ON public.lawyer_ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_lawyer_chat_plaintext_after_encryption();
-- Enable pgsodium extension for encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a server key for encryption (stored securely in Supabase Vault)
SELECT pgsodium.create_key(
  name := 'app_encryption_key',
  key_type := 'aead-det'
);

-- Create encryption helper functions

-- Function to encrypt text data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(plain_text text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  key_id uuid;
  encrypted_data bytea;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get the encryption key
  SELECT id INTO key_id FROM pgsodium.valid_key WHERE name = 'app_encryption_key' LIMIT 1;
  
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Encrypt the data
  encrypted_data := pgsodium.crypto_aead_det_encrypt(
    message := convert_to(plain_text, 'utf8'),
    additional := ''::bytea,
    key_id := key_id
  );
  
  RETURN encrypted_data;
END;
$$;

-- Function to decrypt text data
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  key_id uuid;
  decrypted_data bytea;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the encryption key
  SELECT id INTO key_id FROM pgsodium.valid_key WHERE name = 'app_encryption_key' LIMIT 1;
  
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Decrypt the data
  decrypted_data := pgsodium.crypto_aead_det_decrypt(
    ciphertext := encrypted_data,
    additional := ''::bytea,
    key_id := key_id
  );
  
  RETURN convert_from(decrypted_data, 'utf8');
END;
$$;

-- Add encrypted columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content_encrypted bytea;

-- Add encrypted columns to saved_contracts table
ALTER TABLE public.saved_contracts ADD COLUMN IF NOT EXISTS filled_content_encrypted bytea;

-- Add encrypted columns to contract_analyses table
ALTER TABLE public.contract_analyses ADD COLUMN IF NOT EXISTS contract_text_encrypted bytea;

-- Add encrypted columns to subscriptions table (for Stripe IDs)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id_encrypted bytea;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id_encrypted bytea;

-- Create trigger to auto-encrypt messages on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.content_encrypted := encrypt_sensitive_data(NEW.content);
    -- Keep original content for now (can be removed after migration)
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER encrypt_messages_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_message_content();

-- Create trigger to auto-encrypt saved contracts
CREATE OR REPLACE FUNCTION public.encrypt_contract_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.filled_content IS NOT NULL AND NEW.filled_content != '' THEN
    NEW.filled_content_encrypted := encrypt_sensitive_data(NEW.filled_content);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER encrypt_saved_contracts_trigger
BEFORE INSERT OR UPDATE ON public.saved_contracts
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_contract_content();

-- Create trigger to auto-encrypt contract analyses
CREATE OR REPLACE FUNCTION public.encrypt_analysis_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_text IS NOT NULL AND NEW.contract_text != '' THEN
    NEW.contract_text_encrypted := encrypt_sensitive_data(NEW.contract_text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER encrypt_contract_analyses_trigger
BEFORE INSERT OR UPDATE ON public.contract_analyses
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_analysis_content();

-- Create trigger to auto-encrypt subscription Stripe IDs
CREATE OR REPLACE FUNCTION public.encrypt_subscription_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stripe_customer_id IS NOT NULL AND NEW.stripe_customer_id != '' THEN
    NEW.stripe_customer_id_encrypted := encrypt_sensitive_data(NEW.stripe_customer_id);
  END IF;
  IF NEW.stripe_subscription_id IS NOT NULL AND NEW.stripe_subscription_id != '' THEN
    NEW.stripe_subscription_id_encrypted := encrypt_sensitive_data(NEW.stripe_subscription_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER encrypt_subscriptions_trigger
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_subscription_data();

-- Grant execute permissions on encryption functions
GRANT EXECUTE ON FUNCTION public.encrypt_sensitive_data(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_sensitive_data(bytea) TO authenticated;
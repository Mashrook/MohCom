-- Remove plaintext columns from tables that have encrypted versions
-- These columns have been cleaned up and are no longer needed

-- 1. messages table: remove 'content' plaintext column
ALTER TABLE public.messages DROP COLUMN IF EXISTS content;

-- 2. contract_analyses table: remove 'contract_text' plaintext column  
ALTER TABLE public.contract_analyses DROP COLUMN IF EXISTS contract_text;

-- 3. saved_contracts table: remove 'filled_content' plaintext column
ALTER TABLE public.saved_contracts DROP COLUMN IF EXISTS filled_content;

-- 4. payment_history table: remove plaintext payment IDs
ALTER TABLE public.payment_history DROP COLUMN IF EXISTS tap_charge_id;
ALTER TABLE public.payment_history DROP COLUMN IF EXISTS tap_receipt_id;

-- 5. lawyer_ai_chats table: remove 'messages' plaintext jsonb column
ALTER TABLE public.lawyer_ai_chats DROP COLUMN IF EXISTS messages;
-- تنظيف البيانات غير المشفرة من جميع الجداول الحساسة
-- هذا يحافظ على الأعمدة للتوافق مع الكود لكن يحذف البيانات الحقيقية

-- 1. تنظيف محتوى الرسائل (messages)
UPDATE public.messages 
SET content = '[encrypted]' 
WHERE content != '[encrypted]' AND content != '';

-- 2. تنظيف نص العقود المحللة (contract_analyses)
UPDATE public.contract_analyses 
SET contract_text = '[encrypted]' 
WHERE contract_text_encrypted IS NOT NULL;

-- 3. تنظيف محتوى العقود المحفوظة (saved_contracts)
UPDATE public.saved_contracts 
SET filled_content = '[encrypted]' 
WHERE filled_content_encrypted IS NOT NULL;

-- 4. تنظيف بيانات Stripe من جدول الاشتراكات (subscriptions)
UPDATE public.subscriptions 
SET stripe_customer_id = NULL,
    stripe_subscription_id = NULL
WHERE stripe_customer_id_encrypted IS NOT NULL 
   OR stripe_subscription_id_encrypted IS NOT NULL;

-- 5. تنظيف رسائل محادثات المحامين (lawyer_ai_chats)
UPDATE public.lawyer_ai_chats 
SET messages = '[]'::jsonb 
WHERE messages_encrypted IS NOT NULL;
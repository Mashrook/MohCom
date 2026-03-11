-- إضافة سياسات RLS لجدول public_profiles (view)
-- هذا view ويحتاج لسياسات للقراءة العامة فقط

-- إضافة سياسة للقراءة العامة على public_profiles
CREATE POLICY "Anyone can view public profiles"
ON public.profiles
FOR SELECT
USING (true);

-- تحديث سياسة contract_ratings لتكون أكثر أماناً
-- حذف السياسة الحالية التي تسمح للجميع
DROP POLICY IF EXISTS "Authenticated users can view aggregate ratings" ON public.contract_ratings;

-- إضافة سياسة محدودة للقراءة
CREATE POLICY "Users can view ratings for analytics" 
ON public.contract_ratings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- إضافة فهارس لتحسين الأداء والأمان
CREATE INDEX IF NOT EXISTS idx_saved_contracts_user_id ON public.saved_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_contract_analyses_user_id ON public.contract_analyses(user_id);
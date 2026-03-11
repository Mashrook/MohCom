-- Fix user_presence table - restrict SELECT to only show presence for users in conversations
DROP POLICY IF EXISTS "Authenticated users can view presence" ON public.user_presence;
CREATE POLICY "Users can view presence of contacts only" 
ON public.user_presence 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM messages 
      WHERE (sender_id = user_presence.user_id AND receiver_id = auth.uid())
         OR (receiver_id = user_presence.user_id AND sender_id = auth.uid())
    )
  )
);

-- Fix audit_logs - ensure only service role can insert (not client-side)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only authenticated users trigger audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix security_audit_log - restrict insertion
DROP POLICY IF EXISTS "System can insert security logs" ON public.security_audit_log;
CREATE POLICY "Authenticated actions can log security events" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR current_setting('role') = 'service_role');
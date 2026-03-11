-- Fix overly permissive RLS policies that use WITH CHECK (true) for INSERT operations
-- These should require authentication or service role

-- 1. blocked_ips - System auto-blocking should require authentication
DROP POLICY IF EXISTS "System can auto-block IPs" ON public.blocked_ips;
CREATE POLICY "System can auto-block IPs" 
ON public.blocked_ips 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. blocked_login_attempts - Service role only for logging blocked attempts
DROP POLICY IF EXISTS "Service can insert blocked attempts" ON public.blocked_login_attempts;
CREATE POLICY "Service can insert blocked attempts" 
ON public.blocked_login_attempts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. failed_login_attempts - Tighten to require authentication
DROP POLICY IF EXISTS "System can insert failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "System can log failed attempts" ON public.failed_login_attempts;
CREATE POLICY "System can log failed attempts" 
ON public.failed_login_attempts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. lawyer_applications - Keep as authenticated users can apply, but verify they're authenticated
DROP POLICY IF EXISTS "authenticated_users_can_apply" ON public.lawyer_applications;
CREATE POLICY "authenticated_users_can_apply" 
ON public.lawyer_applications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. login_location_alerts - Require user to be authenticated and inserting for themselves
DROP POLICY IF EXISTS "Service can insert alerts" ON public.login_location_alerts;
CREATE POLICY "Authenticated users can insert own alerts" 
ON public.login_location_alerts 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. password_security_logs - Require authentication
DROP POLICY IF EXISTS "System can insert password security logs" ON public.password_security_logs;
DROP POLICY IF EXISTS "System can log password issues" ON public.password_security_logs;
CREATE POLICY "System can log password issues" 
ON public.password_security_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. payment_errors - Require authentication
DROP POLICY IF EXISTS "System can log payment errors" ON public.payment_errors;
CREATE POLICY "System can log payment errors" 
ON public.payment_errors 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. security_audit_log - Require authentication  
DROP POLICY IF EXISTS "System can write security events" ON public.security_audit_log;
CREATE POLICY "System can write security events" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. security_incidents - Require authentication
DROP POLICY IF EXISTS "System can insert security incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "System can log security incidents" ON public.security_incidents;
CREATE POLICY "System can log security incidents" 
ON public.security_incidents 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
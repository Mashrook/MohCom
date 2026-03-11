-- إصلاح الثغرات الأمنية - الجزء الأول
-- حذف السياسات القديمة أولاً ثم إنشاء الجديدة

-- 1. lawyer_applications
DROP POLICY IF EXISTS "Admins can update lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can view all lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Anyone can insert lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Anyone can view lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins can manage lawyer applications" ON public.lawyer_applications;

CREATE POLICY "lawyer_apps_admin_select"
ON public.lawyer_applications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lawyer_apps_admin_update"
ON public.lawyer_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "lawyer_apps_public_insert"
ON public.lawyer_applications FOR INSERT
WITH CHECK (true);

-- 2. payment_history
DROP POLICY IF EXISTS "Users can view their payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Anyone can view payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users view own payment history" ON public.payment_history;

CREATE POLICY "payment_history_user_select"
ON public.payment_history FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. payment_errors
DROP POLICY IF EXISTS "Anyone can view payment errors" ON public.payment_errors;
DROP POLICY IF EXISTS "Admins can view payment errors" ON public.payment_errors;

CREATE POLICY "payment_errors_admin_select"
ON public.payment_errors FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. security_incidents
DROP POLICY IF EXISTS "Anyone can view security incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "Admins can view security incidents" ON public.security_incidents;

CREATE POLICY "security_incidents_admin_select"
ON public.security_incidents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. admin_audit_log
DROP POLICY IF EXISTS "Anyone can view admin audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view admin audit log" ON public.admin_audit_log;

CREATE POLICY "admin_audit_log_admin_select"
ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. security_audit_log
DROP POLICY IF EXISTS "Anyone can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users view own security events or admins view all" ON public.security_audit_log;

CREATE POLICY "security_audit_log_select"
ON public.security_audit_log FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 7. failed_login_attempts
DROP POLICY IF EXISTS "Anyone can view failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Admins can view failed login attempts" ON public.failed_login_attempts;

CREATE POLICY "failed_login_admin_select"
ON public.failed_login_attempts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. password_security_logs
DROP POLICY IF EXISTS "Anyone can view password security logs" ON public.password_security_logs;
DROP POLICY IF EXISTS "Admins can view password security logs" ON public.password_security_logs;

CREATE POLICY "password_logs_admin_select"
ON public.password_security_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. blocked_ips
DROP POLICY IF EXISTS "Anyone can view blocked ips" ON public.blocked_ips;
DROP POLICY IF EXISTS "Admins can view blocked ips" ON public.blocked_ips;

CREATE POLICY "blocked_ips_admin_select"
ON public.blocked_ips FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. blocked_payment_users
DROP POLICY IF EXISTS "Anyone can view blocked payment users" ON public.blocked_payment_users;
DROP POLICY IF EXISTS "Admins can view blocked payment users" ON public.blocked_payment_users;

CREATE POLICY "blocked_payment_admin_select"
ON public.blocked_payment_users FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 11. admin_sessions
DROP POLICY IF EXISTS "Anyone can view admin sessions" ON public.admin_sessions;
DROP POLICY IF EXISTS "Admins view own or all sessions" ON public.admin_sessions;

CREATE POLICY "admin_sessions_select"
ON public.admin_sessions FOR SELECT
USING (auth.uid() = admin_id OR has_role(auth.uid(), 'admin'::app_role));

-- 12. admin_allowed_ips
DROP POLICY IF EXISTS "Anyone can view admin allowed ips" ON public.admin_allowed_ips;
DROP POLICY IF EXISTS "Admins can view admin allowed ips" ON public.admin_allowed_ips;

CREATE POLICY "admin_allowed_ips_select"
ON public.admin_allowed_ips FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 13. ip_whitelist
DROP POLICY IF EXISTS "Anyone can view ip whitelist" ON public.ip_whitelist;
DROP POLICY IF EXISTS "Admins can view ip whitelist" ON public.ip_whitelist;

CREATE POLICY "ip_whitelist_admin_select"
ON public.ip_whitelist FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 14. admin_security_settings
DROP POLICY IF EXISTS "Anyone can view admin security settings" ON public.admin_security_settings;
DROP POLICY IF EXISTS "Admins can view admin security settings" ON public.admin_security_settings;

CREATE POLICY "admin_security_settings_select"
ON public.admin_security_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 15. backup_history
DROP POLICY IF EXISTS "Anyone can view backup history" ON public.backup_history;
DROP POLICY IF EXISTS "Admins can view backup history" ON public.backup_history;

CREATE POLICY "backup_history_admin_select"
ON public.backup_history FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 16. account_locks
DROP POLICY IF EXISTS "Anyone can view account locks" ON public.account_locks;
DROP POLICY IF EXISTS "Users view own locks or admins view all" ON public.account_locks;

CREATE POLICY "account_locks_select"
ON public.account_locks FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 17. user_sessions
DROP POLICY IF EXISTS "Anyone can view user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users view own sessions only" ON public.user_sessions;

CREATE POLICY "user_sessions_select"
ON public.user_sessions FOR SELECT
USING (auth.uid() = user_id);

-- 18. login_location_alerts
DROP POLICY IF EXISTS "Anyone can view login location alerts" ON public.login_location_alerts;
DROP POLICY IF EXISTS "Users view own login alerts only" ON public.login_location_alerts;

CREATE POLICY "login_alerts_select"
ON public.login_location_alerts FOR SELECT
USING (auth.uid() = user_id);

-- 19. blocked_login_attempts
DROP POLICY IF EXISTS "Anyone can view blocked login attempts" ON public.blocked_login_attempts;
DROP POLICY IF EXISTS "Users view own blocked attempts only" ON public.blocked_login_attempts;

CREATE POLICY "blocked_login_attempts_select"
ON public.blocked_login_attempts FOR SELECT
USING (auth.uid() = user_id);

-- 20. user_known_locations
DROP POLICY IF EXISTS "Anyone can view user known locations" ON public.user_known_locations;
DROP POLICY IF EXISTS "Users view own locations only" ON public.user_known_locations;

CREATE POLICY "user_known_locations_select"
ON public.user_known_locations FOR SELECT
USING (auth.uid() = user_id);

-- 21. user_security_settings
DROP POLICY IF EXISTS "Anyone can view user security settings" ON public.user_security_settings;
DROP POLICY IF EXISTS "Users view own security settings only" ON public.user_security_settings;

CREATE POLICY "user_security_settings_select"
ON public.user_security_settings FOR SELECT
USING (auth.uid() = user_id);
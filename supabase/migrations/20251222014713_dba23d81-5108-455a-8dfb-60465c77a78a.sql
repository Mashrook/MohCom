-- إصلاح ثغرة auto_block_escalation
-- منع التصعيد التلقائي للحظر الدائم - يتطلب موافقة admin صريحة

CREATE OR REPLACE FUNCTION public.auto_block_ip(
  p_ip_address text, 
  p_reason text, 
  p_attempt_count integer DEFAULT 0, 
  p_block_hours integer DEFAULT 24
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked_id UUID;
  v_current_attempts INTEGER;
  v_is_service_role BOOLEAN;
BEGIN
  -- التحقق من أن المستدعي هو service_role أو admin
  v_is_service_role := current_setting('role', true) = 'service_role';
  
  IF NOT v_is_service_role AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only service_role or admin can auto-block IPs';
  END IF;

  -- التحقق من أن IP ليس في القائمة البيضاء
  IF is_ip_whitelisted(p_ip_address) THEN
    RETURN NULL;
  END IF;

  -- الحصول على عدد المحاولات الحالية
  SELECT attempt_count INTO v_current_attempts
  FROM public.blocked_ips
  WHERE ip_address = p_ip_address AND unblocked_at IS NULL;

  -- إدراج أو تحديث IP المحظور
  -- مهم: لا يتم التصعيد للحظر الدائم تلقائياً
  INSERT INTO public.blocked_ips (
    ip_address,
    reason,
    blocked_until,
    auto_blocked,
    attempt_count,
    is_permanent
  ) VALUES (
    p_ip_address,
    p_reason,
    now() + (p_block_hours || ' hours')::interval,
    true,
    p_attempt_count,
    false  -- لا حظر دائم تلقائي أبداً
  )
  ON CONFLICT (ip_address) WHERE unblocked_at IS NULL
  DO UPDATE SET
    attempt_count = blocked_ips.attempt_count + p_attempt_count,
    -- تمديد فترة الحظر فقط، بدون تحويل لحظر دائم
    blocked_until = now() + (p_block_hours || ' hours')::interval,
    reason = p_reason,
    -- is_permanent يبقى كما هو - لا يمكن تغييره إلا بواسطة admin مباشرة
    is_permanent = blocked_ips.is_permanent
  RETURNING id INTO v_blocked_id;

  -- تسجيل العملية في سجل الأمان
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    success,
    ip_address
  ) VALUES (
    auth.uid(),
    'auto_block_ip',
    'blocked_ips',
    v_blocked_id,
    true,
    p_ip_address
  );
  
  RETURN v_blocked_id;
END;
$function$;

-- إضافة دالة جديدة للمسؤولين فقط لتحويل الحظر لدائم
CREATE OR REPLACE FUNCTION public.make_ip_block_permanent(p_ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- فقط المسؤولين يمكنهم جعل الحظر دائماً
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can make IP blocks permanent';
  END IF;

  UPDATE public.blocked_ips
  SET 
    is_permanent = true,
    blocked_until = NULL,
    blocked_by = auth.uid()
  WHERE ip_address = p_ip_address
  AND unblocked_at IS NULL;

  -- تسجيل في سجل المسؤولين
  INSERT INTO public.admin_audit_log (
    admin_id,
    action_type,
    target_table,
    action_description
  ) VALUES (
    auth.uid(),
    'ip_block_permanent',
    'blocked_ips',
    'تحويل حظر IP إلى دائم: ' || p_ip_address
  );

  RETURN FOUND;
END;
$function$;
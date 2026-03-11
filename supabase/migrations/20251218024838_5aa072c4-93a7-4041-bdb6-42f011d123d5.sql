-- إنشاء جدول مفصل لتدقيق عمليات المدير
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  target_user_id UUID,
  old_values JSONB,
  new_values JSONB,
  action_description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- فهرس للبحث السريع
CREATE INDEX idx_admin_audit_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_target_user ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created_at ON public.admin_audit_log(created_at DESC);

-- تفعيل RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- سياسات RLS - فقط المديرين يمكنهم القراءة
CREATE POLICY "Only admins can view admin audit log"
ON public.admin_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- لا يمكن لأحد تعديل أو حذف السجلات
CREATE POLICY "No one can update admin audit log"
ON public.admin_audit_log
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete admin audit log"
ON public.admin_audit_log
FOR DELETE
USING (false);

-- فقط النظام يمكنه الإدراج
CREATE POLICY "Only authenticated admins can insert"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'));

-- دالة لتسجيل عمليات المدير
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_target_table TEXT,
  p_target_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- التحقق من أن المستخدم مدير
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;
  
  INSERT INTO public.admin_audit_log (
    admin_id,
    action_type,
    target_table,
    target_id,
    target_user_id,
    old_values,
    new_values,
    action_description
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_target_table,
    p_target_id,
    p_target_user_id,
    p_old_values,
    p_new_values,
    p_description
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger لتسجيل تغييرات أدوار المستخدمين تلقائياً
CREATE OR REPLACE FUNCTION public.audit_admin_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- فقط تسجيل إذا كان المنفذ مديراً
  IF has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.admin_audit_log (admin_id, action_type, target_table, target_id, target_user_id, new_values, action_description)
      VALUES (auth.uid(), 'role_assigned', 'user_roles', NEW.id, NEW.user_id, row_to_json(NEW)::jsonb, 'تعيين دور: ' || NEW.role::text);
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.admin_audit_log (admin_id, action_type, target_table, target_id, target_user_id, old_values, new_values, action_description)
      VALUES (auth.uid(), 'role_changed', 'user_roles', NEW.id, NEW.user_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, 'تغيير الدور من ' || OLD.role::text || ' إلى ' || NEW.role::text);
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.admin_audit_log (admin_id, action_type, target_table, target_id, target_user_id, old_values, action_description)
      VALUES (auth.uid(), 'role_removed', 'user_roles', OLD.id, OLD.user_id, row_to_json(OLD)::jsonb, 'إزالة الدور: ' || OLD.role::text);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- إنشاء Trigger على جدول الأدوار
DROP TRIGGER IF EXISTS trigger_audit_admin_role_changes ON public.user_roles;
CREATE TRIGGER trigger_audit_admin_role_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_role_changes();

-- Trigger لتسجيل تغييرات الاشتراكات
CREATE OR REPLACE FUNCTION public.audit_admin_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.plan_type != NEW.plan_type) THEN
      INSERT INTO public.admin_audit_log (admin_id, action_type, target_table, target_id, target_user_id, old_values, new_values, action_description)
      VALUES (
        auth.uid(), 
        'subscription_modified', 
        'subscriptions', 
        NEW.id, 
        NEW.user_id, 
        jsonb_build_object('status', OLD.status, 'plan_type', OLD.plan_type, 'current_period_end', OLD.current_period_end),
        jsonb_build_object('status', NEW.status, 'plan_type', NEW.plan_type, 'current_period_end', NEW.current_period_end),
        'تعديل الاشتراك: ' || OLD.status || ' → ' || NEW.status
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_admin_subscription_changes ON public.subscriptions;
CREATE TRIGGER trigger_audit_admin_subscription_changes
AFTER UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_subscription_changes();
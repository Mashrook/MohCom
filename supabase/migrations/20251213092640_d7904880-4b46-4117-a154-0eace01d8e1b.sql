-- Fix log_audit_event to handle null auth.uid() during signup
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text, 
  p_table_name text, 
  p_record_id uuid DEFAULT NULL::uuid, 
  p_old_data jsonb DEFAULT NULL::jsonb, 
  p_new_data jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id, falling back to the user_id from new_data if auth.uid() is null
  v_user_id := COALESCE(
    auth.uid(),
    (p_new_data->>'user_id')::uuid,
    (p_old_data->>'user_id')::uuid
  );
  
  -- Only log if we have a valid user_id
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (v_user_id, p_action, p_table_name, p_record_id, p_old_data, p_new_data);
  END IF;
END;
$$;
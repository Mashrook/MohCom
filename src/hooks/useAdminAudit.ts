import { supabase } from "@/integrations/supabase/client";

export type AdminActionType = 
  | 'role_assigned'
  | 'role_changed'
  | 'role_removed'
  | 'subscription_modified'
  | 'user_created'
  | 'user_deleted'
  | 'content_updated'
  | 'settings_changed'
  | 'data_export'
  | 'data_access'
  | 'file_deleted'
  | 'user_blocked'
  | 'user_unblocked'
  | 'lawyer_permission_changed'
  | 'api_key_updated'
  | 'communication_monitored';

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id: string | null;
  target_user_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  action_description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const logAdminAction = async (
  actionType: AdminActionType,
  targetTable: string,
  options?: {
    targetId?: string;
    targetUserId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    description?: string;
  }
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action_type: actionType,
      p_target_table: targetTable,
      p_target_id: options?.targetId || null,
      p_target_user_id: options?.targetUserId || null,
      p_old_values: options?.oldValues || null,
      p_new_values: options?.newValues || null,
      p_description: options?.description || null
    });

    if (error) {
      console.error('Error logging admin action:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Failed to log admin action:', err);
    return null;
  }
};

export const fetchAdminAuditLogs = async (
  options?: {
    limit?: number;
    offset?: number;
    actionType?: string;
    targetUserId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AdminAuditLog[]> => {
  try {
    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.actionType) {
      query = query.eq('action_type', options.actionType);
    }

    if (options?.targetUserId) {
      query = query.eq('target_user_id', options.targetUserId);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin audit logs:', error);
      return [];
    }

    return data as AdminAuditLog[];
  } catch (err) {
    console.error('Failed to fetch admin audit logs:', err);
    return [];
  }
};

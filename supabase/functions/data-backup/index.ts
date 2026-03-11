import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables to backup
const BACKUP_TABLES = [
  'profiles',
  'user_roles',
  'subscriptions',
  'payment_history',
  'messages',
  'contract_analyses',
  'saved_contracts',
  'contract_templates',
  'contract_downloads',
  'contract_ratings',
  'lawyer_profiles',
  'lawyer_ai_chats',
  'saved_searches',
  'service_trials',
  'files',
  'file_shares',
  'blog_posts',
  'admin_audit_log',
  'audit_logs',
  'security_audit_log',
  'failed_login_attempts',
  'password_security_logs',
  'payment_errors',
  'blocked_payment_users',
  'user_presence',
  'site_content',
  'section_settings',
  'support_chats',
];

interface BackupResult {
  table: string;
  count: number;
  data: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { backupType = 'manual' } = await req.json().catch(() => ({}));

    console.log(`Starting ${backupType} backup by admin:`, user.id);

    // Create backup history record
    const { data: backupRecord, error: insertError } = await supabase
      .from('backup_history')
      .insert({
        backup_type: backupType,
        status: 'pending',
        created_by: user.id,
        tables_included: BACKUP_TABLES,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create backup record:', insertError);
      throw new Error('Failed to initialize backup');
    }

    const backupId = backupRecord.id;
    const results: BackupResult[] = [];
    const recordsCounts: Record<string, number> = {};

    // Backup each table
    for (const table of BACKUP_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(10000);

        if (error) {
          console.warn(`Failed to backup table ${table}:`, error.message);
          recordsCounts[table] = 0;
          results.push({ table, count: 0, data: [] });
        } else {
          const count = data?.length || 0;
          recordsCounts[table] = count;
          results.push({ table, count, data: data || [] });
          console.log(`Backed up ${count} records from ${table}`);
        }
      } catch (err) {
        console.error(`Error backing up ${table}:`, err);
        recordsCounts[table] = 0;
        results.push({ table, count: 0, data: [] });
      }
    }

    // Create backup file content
    const backupData = {
      metadata: {
        created_at: new Date().toISOString(),
        backup_id: backupId,
        backup_type: backupType,
        created_by: user.id,
        total_tables: BACKUP_TABLES.length,
        total_records: Object.values(recordsCounts).reduce((a, b) => a + b, 0),
      },
      tables: results.reduce((acc, { table, data }) => {
        acc[table] = data;
        return acc;
      }, {} as Record<string, any[]>),
    };

    const backupContent = JSON.stringify(backupData, null, 2);
    const backupBlob = new Blob([backupContent], { type: 'application/json' });
    const fileSize = backupBlob.size;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${backupType}_${timestamp}.json`;
    const filePath = `${backupType}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filePath, backupBlob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Failed to upload backup:', uploadError);
      
      // Update backup record as failed
      await supabase
        .from('backup_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: uploadError.message,
        })
        .eq('id', backupId);

      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    // Update backup record as completed
    const { error: updateError } = await supabase
      .from('backup_history')
      .update({
        status: 'completed',
        file_path: filePath,
        file_size: fileSize,
        records_count: recordsCounts,
        completed_at: new Date().toISOString(),
      })
      .eq('id', backupId);

    if (updateError) {
      console.error('Failed to update backup record:', updateError);
    }

    // Get download URL
    const { data: signedUrlData } = await supabase.storage
      .from('backups')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    console.log(`Backup completed successfully: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupId,
        file_path: filePath,
        file_size: fileSize,
        records_count: recordsCounts,
        download_url: signedUrlData?.signedUrl,
        total_records: Object.values(recordsCounts).reduce((a, b) => a + b, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Backup failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

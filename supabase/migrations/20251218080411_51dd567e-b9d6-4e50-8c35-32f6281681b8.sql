-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for admin-only access to backups bucket
CREATE POLICY "Admins can manage backups" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'backups' AND public.has_role(auth.uid(), 'admin'));

-- Create table to track backup history
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  file_path TEXT,
  file_size BIGINT,
  tables_included TEXT[],
  records_count JSONB,
  created_by UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access to backup history
CREATE POLICY "Admins can view backup history"
ON public.backup_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert backup history"
ON public.backup_history
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update backup history"
ON public.backup_history
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON public.backup_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON public.backup_history(status);
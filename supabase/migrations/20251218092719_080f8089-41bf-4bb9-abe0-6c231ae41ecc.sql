-- Create lawyer applications table
CREATE TABLE public.lawyer_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'قانون عام',
  experience_years INTEGER NOT NULL DEFAULT 1,
  location TEXT NOT NULL DEFAULT 'الرياض',
  bio TEXT,
  license_number TEXT NOT NULL,
  license_file_url TEXT,
  id_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can submit lawyer applications"
ON public.lawyer_applications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Applicants can view their own applications"
ON public.lawyer_applications
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all applications"
ON public.lawyer_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.lawyer_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete applications"
ON public.lawyer_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for lawyer documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lawyer-documents', 'lawyer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload lawyer documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lawyer-documents');

CREATE POLICY "Admins can view lawyer documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lawyer-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lawyer documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lawyer-documents' AND has_role(auth.uid(), 'admin'));
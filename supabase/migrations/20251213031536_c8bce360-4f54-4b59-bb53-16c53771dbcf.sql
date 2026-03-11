-- Create site_content table for CMS
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  content JSONB DEFAULT '{}',
  images JSONB DEFAULT '[]',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table for file management
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  shared_with UUID[],
  is_public BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lawyer_ai_chats table for lawyer-specific AI conversations
CREATE TABLE public.lawyer_ai_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  messages JSONB DEFAULT '[]',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for user-to-user messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  file_id UUID REFERENCES public.files(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Site Content Policies (Admin only for write)
CREATE POLICY "Anyone can view site content"
ON public.site_content FOR SELECT
USING (true);

CREATE POLICY "Admins can manage site content"
ON public.site_content FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Files Policies
CREATE POLICY "Admins can view all files"
ON public.files FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view files shared with them"
ON public.files FOR SELECT
USING (
  auth.uid() = uploaded_by 
  OR auth.uid() = ANY(shared_with)
  OR is_public = true
);

CREATE POLICY "Users can upload files"
ON public.files FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own files"
ON public.files FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own files"
ON public.files FOR DELETE
USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));

-- Lawyer AI Chats Policies (Lawyers only)
CREATE POLICY "Lawyers can view their own chats"
ON public.lawyer_ai_chats FOR SELECT
USING (auth.uid() = lawyer_id AND public.has_role(auth.uid(), 'lawyer'));

CREATE POLICY "Lawyers can create chats"
ON public.lawyer_ai_chats FOR INSERT
WITH CHECK (auth.uid() = lawyer_id AND public.has_role(auth.uid(), 'lawyer'));

CREATE POLICY "Lawyers can update their own chats"
ON public.lawyer_ai_chats FOR UPDATE
USING (auth.uid() = lawyer_id AND public.has_role(auth.uid(), 'lawyer'));

CREATE POLICY "Lawyers can delete their own chats"
ON public.lawyer_ai_chats FOR DELETE
USING (auth.uid() = lawyer_id AND public.has_role(auth.uid(), 'lawyer'));

-- Messages Policies
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('platform-files', 'platform-files', false);

-- Storage policies
CREATE POLICY "Admins can view all files in storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own files in storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'platform-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'platform-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'platform-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Triggers for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lawyer_ai_chats_updated_at
BEFORE UPDATE ON public.lawyer_ai_chats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
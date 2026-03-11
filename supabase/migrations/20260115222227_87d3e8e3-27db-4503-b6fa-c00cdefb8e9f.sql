-- Create app_download_links table for storing download URLs
CREATE TABLE public.app_download_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE CHECK (platform IN ('ios', 'android')),
  store_url TEXT NOT NULL DEFAULT '#',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_download_links ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view active download links" 
ON public.app_download_links 
FOR SELECT 
USING (is_active = true);

-- Create policy for admin update access
CREATE POLICY "Admins can manage download links" 
ON public.app_download_links 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default values
INSERT INTO public.app_download_links (platform, store_url) VALUES 
  ('ios', '#'),
  ('android', '#');

-- Create trigger for updated_at
CREATE TRIGGER update_app_download_links_updated_at
BEFORE UPDATE ON public.app_download_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
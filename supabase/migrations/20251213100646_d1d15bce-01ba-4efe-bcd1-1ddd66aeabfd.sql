-- Create lawyer_profiles table for additional lawyer information
CREATE TABLE public.lawyer_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty text DEFAULT 'قانون عام',
  experience_years integer DEFAULT 1,
  hourly_rate integer DEFAULT 300,
  location text DEFAULT 'الرياض',
  bio text,
  is_available boolean DEFAULT false,
  rating numeric DEFAULT 0,
  reviews_count integer DEFAULT 0,
  badges text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_presence table for online tracking
CREATE TABLE public.user_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Lawyer profiles policies
CREATE POLICY "Anyone can view lawyer profiles"
ON public.lawyer_profiles
FOR SELECT
USING (true);

CREATE POLICY "Lawyers can update their own profile"
ON public.lawyer_profiles
FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'lawyer'));

CREATE POLICY "System can insert lawyer profiles"
ON public.lawyer_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage lawyer profiles"
ON public.lawyer_profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- User presence policies
CREATE POLICY "Anyone can view presence"
ON public.user_presence
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence"
ON public.user_presence
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage presence"
ON public.user_presence
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Auto-create lawyer profile when role is assigned
CREATE OR REPLACE FUNCTION public.handle_new_lawyer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'lawyer' THEN
    INSERT INTO public.lawyer_profiles (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lawyer_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_lawyer();

-- Update timestamp trigger for lawyer_profiles
CREATE TRIGGER update_lawyer_profiles_updated_at
  BEFORE UPDATE ON public.lawyer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for user_presence
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
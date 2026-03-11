-- Create contract analyses table
CREATE TABLE public.contract_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contract_text TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('analyze', 'review')),
  summary TEXT NOT NULL,
  risks TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  legal_references TEXT[] DEFAULT '{}',
  overall_rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own analyses
CREATE POLICY "Users can view their own analyses"
ON public.contract_analyses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
ON public.contract_analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
ON public.contract_analyses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
ON public.contract_analyses
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_contract_analyses_updated_at
BEFORE UPDATE ON public.contract_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
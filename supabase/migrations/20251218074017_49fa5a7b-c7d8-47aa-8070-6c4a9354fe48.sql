-- Create saved_searches table for favorite search results
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  result_content TEXT NOT NULL,
  citations JSONB DEFAULT '[]'::jsonb,
  search_type TEXT NOT NULL DEFAULT 'perplexity',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved searches
CREATE POLICY "Users can create saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved searches
CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
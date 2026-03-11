-- Create table for saved filled contracts
CREATE TABLE public.saved_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.contract_templates(id),
  title TEXT NOT NULL,
  filled_content TEXT NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_contracts ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved contracts
CREATE POLICY "Users can view their own saved contracts"
ON public.saved_contracts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved contracts
CREATE POLICY "Users can create saved contracts"
ON public.saved_contracts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved contracts
CREATE POLICY "Users can update their own saved contracts"
ON public.saved_contracts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own saved contracts
CREATE POLICY "Users can delete their own saved contracts"
ON public.saved_contracts
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all saved contracts
CREATE POLICY "Admins can view all saved contracts"
ON public.saved_contracts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_saved_contracts_updated_at
BEFORE UPDATE ON public.saved_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
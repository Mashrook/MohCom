-- Create table for tracking incoming calls
CREATE TABLE public.call_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('video', 'voice')),
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'missed', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_notifications ENABLE ROW LEVEL SECURITY;

-- Users can see calls where they are caller or receiver
CREATE POLICY "Users can view their own calls"
ON public.call_notifications
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can create calls (as caller)
CREATE POLICY "Users can create calls"
ON public.call_notifications
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update calls they are part of
CREATE POLICY "Users can update their calls"
ON public.call_notifications
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_notifications;

-- Create trigger to update updated_at
CREATE TRIGGER update_call_notifications_updated_at
BEFORE UPDATE ON public.call_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
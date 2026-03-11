-- Add communication settings to section_settings table
INSERT INTO public.section_settings (section_key, section_name, is_enabled, display_order) VALUES
  ('voice_calls', 'المكالمات الصوتية', true, 100),
  ('video_calls', 'مكالمات الفيديو', true, 101),
  ('chat_messages', 'الدردشة النصية', true, 102)
ON CONFLICT (section_key) DO NOTHING;
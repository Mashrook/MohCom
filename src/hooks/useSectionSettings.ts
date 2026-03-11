import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SectionSetting {
  id: string;
  section_key: string;
  section_name: string;
  is_enabled: boolean;
  display_order: number;
}

export function useSectionSettings() {
  const [settings, setSettings] = useState<SectionSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("section_settings")
          .select("*")
          .order("display_order");

        if (error) throw error;
        setSettings(data || []);
      } catch (error) {
        console.error("Error fetching section settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const isSectionEnabled = (sectionKey: string): boolean => {
    const section = settings.find(s => s.section_key === sectionKey);
    // Default to true if setting not found
    return section?.is_enabled ?? true;
  };

  const getSectionOrder = (sectionKey: string): number => {
    const section = settings.find(s => s.section_key === sectionKey);
    return section?.display_order ?? 999;
  };

  const getOrderedHomepageSections = () => {
    return settings
      .filter(s => s.display_order < 10 && s.is_enabled)
      .sort((a, b) => a.display_order - b.display_order)
      .map(s => s.section_key);
  };

  return { settings, loading, isSectionEnabled, getSectionOrder, getOrderedHomepageSections };
}

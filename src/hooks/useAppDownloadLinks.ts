import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppLink {
  platform: string;
  store_url: string;
  is_active: boolean;
}

export function useAppDownloadLinks() {
  const [links, setLinks] = useState<AppLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const { data, error } = await supabase
          .from("app_download_links")
          .select("platform, store_url, is_active")
          .eq("is_active", true);
        
        if (error) throw error;
        setLinks(data || []);
      } catch (error) {
        console.error("Error fetching app links:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  const getActiveLink = () => {
    // Return the first active link with a valid URL
    return links.find(link => link.is_active && link.store_url && link.store_url !== '#');
  };

  const hasActiveLink = () => {
    return links.some(link => link.is_active && link.store_url && link.store_url !== '#');
  };

  return { links, loading, getActiveLink, hasActiveLink };
}

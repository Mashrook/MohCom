import { useEffect, useState } from "react";

type MoyasarConfig = {
  publishableKey: string;
  supportedMethods?: string[];
  supportedNetworks?: string[];
};

const getFunctionsBaseUrl = () => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("Missing backend URL");
  return `${base}/functions/v1`;
};

export function useMoyasarConfig(enabled: boolean) {
  const [data, setData] = useState<MoyasarConfig | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `${getFunctionsBaseUrl()}/get-moyasar-config`;

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey,
          },
        });

        const json = (await res.json().catch(() => ({}))) as any;

        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        if (!json?.publishableKey) {
          throw new Error("Moyasar not configured");
        }

        if (!cancelled) {
          setData({
            publishableKey: json.publishableKey,
            supportedMethods: json.supportedMethods,
            supportedNetworks: json.supportedNetworks,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, error, loading };
}

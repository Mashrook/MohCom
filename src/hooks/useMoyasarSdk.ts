import { useEffect, useState } from "react";

declare global {
  interface Window {
    Moyasar?: any;
    __moyasarSdkPromise?: Promise<void>;
  }
}

const MOYASAR_CSS_ID = "moyasar-css";
const MOYASAR_SCRIPT_ID = "moyasar-script";
const MOYASAR_CSS_URL = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.css";
const MOYASAR_SCRIPT_URL = "https://cdn.moyasar.com/mpf/1.14.0/moyasar.js";

function ensureMoyasarSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.Moyasar) return Promise.resolve();
  if (window.__moyasarSdkPromise) return window.__moyasarSdkPromise;

  window.__moyasarSdkPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.getElementById(MOYASAR_CSS_ID)) {
      const link = document.createElement("link");
      link.id = MOYASAR_CSS_ID;
      link.rel = "stylesheet";
      link.href = MOYASAR_CSS_URL;
      document.head.appendChild(link);
    }

    // Script
    const existing = document.getElementById(MOYASAR_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const check = () => {
        if (window.Moyasar) resolve();
        else setTimeout(check, 50);
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.id = MOYASAR_SCRIPT_ID;
    script.src = MOYASAR_SCRIPT_URL;
    script.async = true;

    const timeout = window.setTimeout(() => {
      reject(new Error("Moyasar SDK load timeout"));
    }, 15000);

    script.onload = () => {
      window.clearTimeout(timeout);
      // onload may fire before window.Moyasar is ready
      const check = () => {
        if (window.Moyasar) resolve();
        else setTimeout(check, 0);
      };
      check();
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Failed to load Moyasar SDK"));
    };

    document.body.appendChild(script);
  });

  return window.__moyasarSdkPromise;
}

export function useMoyasarSdk(enabled: boolean) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    ensureMoyasarSdk()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { ready, error };
}

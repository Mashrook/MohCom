import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerSW } from "virtual:pwa-register";
import "./native/bridge"; // Initialize native iOS bridge before app renders
import App from "./App.tsx";
import "./index.css";

// Best-effort cleanup: never persist backend API responses in Cache Storage.
// This prevents stale/empty data (e.g., contracts list) after security/RLS changes.
(async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k === "api-cache")
          .map((k) => caches.delete(k))
      );
    }

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update()));
    }
  } catch {
    // ignore
  }
})();

// Register service worker
registerSW({
  onNeedRefresh() {
    if (confirm("تحديث جديد متاح. هل تريد تحديث الصفحة؟")) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log("التطبيق جاهز للعمل بدون إنترنت");
  },
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

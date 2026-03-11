import { useEffect } from "react";

// Define page imports for prefetching
const pageImports = {
  "/": () => import("@/pages/Index"),
  "/about": () => import("@/pages/About"),
  "/auth": () => import("@/pages/Auth"),
  "/pricing": () => import("@/pages/Pricing"),
  "/contact": () => import("@/pages/Contact"),
  "/consultation": () => import("@/pages/Consultation"),
  "/contracts": () => import("@/pages/Contracts"),
  "/lawyers": () => import("@/pages/Lawyers"),
  "/predictions": () => import("@/pages/Predictions"),
  "/complaints": () => import("@/pages/Complaints"),
  "/legal-search": () => import("@/pages/LegalSearch"),
};

// Pages to prefetch on initial load (most visited)
const priorityPages = ["/", "/auth", "/pricing", "/consultation", "/contracts"];

// Prefetch a single page
export const prefetchPage = (path: string) => {
  const importFn = pageImports[path as keyof typeof pageImports];
  if (importFn) {
    importFn().catch(() => {
      // Silently fail - prefetch is an optimization
    });
  }
};

// Prefetch multiple pages
export const prefetchPages = (paths: string[]) => {
  paths.forEach(prefetchPage);
};

// Hook to prefetch priority pages after initial load
export const usePrefetchPriorityPages = () => {
  useEffect(() => {
    // Wait for idle time to prefetch
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        prefetchPages(priorityPages);
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        prefetchPages(priorityPages);
      }, 2000);
    }
  }, []);
};

// Hook to prefetch on hover
export const usePrefetchOnHover = (path: string) => {
  const handleMouseEnter = () => {
    prefetchPage(path);
  };

  return { onMouseEnter: handleMouseEnter };
};

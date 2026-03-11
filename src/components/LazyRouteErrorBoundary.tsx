import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LazyRouteErrorBoundaryProps {
  children: ReactNode;
}

interface LazyRouteErrorBoundaryState {
  hasError: boolean;
}

const RELOAD_FLAG = "lazy-route-reload-attempted";

const getCurrentRouteKey = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.hash}`;
};

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("chunkloaderror")
  );
};

export class LazyRouteErrorBoundary extends Component<
  LazyRouteErrorBoundaryProps,
  LazyRouteErrorBoundaryState
> {
  state: LazyRouteErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const routeKey = getCurrentRouteKey();
      const hasRetried = sessionStorage.getItem(RELOAD_FLAG) === routeKey;

      if (!hasRetried) {
        sessionStorage.setItem(RELOAD_FLAG, routeKey);
        window.location.reload();
        return;
      }
    }

    console.error("Lazy route render failed:", error);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(RELOAD_FLAG);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
          <div className="max-w-md space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">تعذر تحميل الصفحة</h2>
            <p className="text-sm text-muted-foreground">
              تم اكتشاف نسخة قديمة من ملفات التطبيق. أعد تحميل الصفحة للحصول على آخر إصدار.
            </p>
            <Button onClick={this.handleReload} className="bg-golden text-black hover:bg-golden/90">
              إعادة تحميل الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
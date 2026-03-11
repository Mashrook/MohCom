import { ReactNode } from "react";
import { useEntitlement, useIsInsideNativeApp } from "@/hooks/useEntitlement";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wraps premium features. Renders children only when the user has an active entitlement.
 * Otherwise shows an upgrade prompt that opens the native paywall (iOS) or a web message.
 */
export function PremiumGate({ children, fallback }: PremiumGateProps) {
  const { active } = useEntitlement();
  const isNative = useIsInsideNativeApp();

  if (active) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const handleUpgrade = async () => {
    try {
      const { default: StoreKit } = await import("@/native/storekit");
      const entitlement = await StoreKit.getEntitlement();
      if (!entitlement.active) {
        (window as any).MOHAMIE_NATIVE?.openPaywall?.();
      }
    } catch {
      // not inside native — ignore
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[hsl(45,80%,55%)] bg-card p-8 text-center shadow-lg">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(45,80%,55%)]/10">
        <Crown className="h-7 w-7 text-[hsl(45,80%,55%)]" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">ميزة مميزة</h3>
        <p className="text-sm text-muted-foreground">
          هذه الميزة متاحة للمشتركين فقط
        </p>
      </div>
      {isNative ? (
        <Button
          onClick={handleUpgrade}
          className="rounded-xl border-2 border-[hsl(45,80%,55%)] bg-foreground font-bold text-background hover:bg-foreground/90"
        >
          <Lock className="ml-2 h-4 w-4" />
          ترقية الآن
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          الميزات المميزة متاحة عبر تطبيق محامي على iOS
        </p>
      )}
    </div>
  );
}

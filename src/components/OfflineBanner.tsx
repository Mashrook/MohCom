import { WifiOff } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export const OfflineBanner = () => {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-2 px-4 text-center flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">أنت غير متصل بالإنترنت - بعض الميزات قد لا تعمل</span>
    </div>
  );
};

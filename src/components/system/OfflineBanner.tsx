import { WifiOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineQueue";

export function OfflineBanner() {
  const online = useOfflineStatus();
  if (online) return null;
  return (
    <div className="fixed left-1/2 top-3 z-[200] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur">
        <WifiOff className="h-3.5 w-3.5 text-amber-500" />
        Offline · cached listings only · messages will send when online
      </div>
    </div>
  );
}

export default OfflineBanner;

import { cn } from "@/lib/utils";

type Variant = "listing" | "photo" | "kpi" | "row";

interface Props {
  variant?: Variant;
  className?: string;
}

function Bar({ w, h = "h-3" }: { w: string; h?: string }) {
  return (
    <div
      className={cn(
        "smart-image-shimmer rounded-md",
        h,
        w,
      )}
    />
  );
}

export function SkeletonCard({ variant = "listing", className }: Props) {
  if (variant === "photo") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="smart-image-shimmer aspect-video w-full rounded-lg" />
        <Bar w="w-2/3" />
      </div>
    );
  }
  if (variant === "kpi") {
    return (
      <div
        className={cn(
          "kpi-card flex flex-col gap-3 rounded-lg border p-4",
          className,
        )}
      >
        <Bar w="w-1/3" h="h-3" />
        <Bar w="w-2/3" h="h-6" />
        <Bar w="w-1/2" h="h-2" />
      </div>
    );
  }
  if (variant === "row") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="smart-image-shimmer h-12 w-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Bar w="w-3/4" />
          <Bar w="w-1/2" h="h-2" />
        </div>
      </div>
    );
  }
  // listing
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="smart-image-shimmer aspect-[4/3] w-full rounded-lg" />
      <Bar w="w-3/4" h="h-4" />
      <Bar w="w-1/2" h="h-3" />
      <Bar w="w-1/3" h="h-4" />
    </div>
  );
}

export default SkeletonCard;

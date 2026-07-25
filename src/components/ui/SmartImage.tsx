import { useState, ImgHTMLAttributes, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

type Aspect = "video" | "square" | "4/3" | "3/2" | "2/3" | number;

export interface SmartImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> {
  src?: string | null;
  alt: string;
  /** Reserved aspect ratio; prevents CLS. */
  aspect?: Aspect;
  /** True for above-the-fold / LCP images. */
  priority?: boolean;
  /** Applied to the outer wrapper. */
  wrapperClassName?: string;
  /** Rounded utility applied to wrapper AND fallback. */
  radiusClass?: string;
  /** object-fit style; defaults to cover. */
  objectFit?: "cover" | "contain";
  sizes?: string;
}

function aspectToPadding(a: Aspect): string {
  if (typeof a === "number") return `${(1 / a) * 100}%`;
  switch (a) {
    case "video":
      return "56.25%"; // 16:9
    case "square":
      return "100%";
    case "4/3":
      return "75%";
    case "3/2":
      return "66.6667%";
    case "2/3":
      return "150%";
    default:
      return "75%";
  }
}

export function SmartImage({
  src,
  alt,
  aspect = "4/3",
  priority = false,
  wrapperClassName,
  radiusClass,
  objectFit = "cover",
  className,
  sizes,
  style,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const hasSrc = Boolean(src);

  const wrapperStyle: CSSProperties = {
    paddingTop: aspectToPadding(aspect),
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-white/5",
        radiusClass,
        wrapperClassName,
      )}
      style={wrapperStyle}
    >
      {/* Shimmer skeleton */}
      {!loaded && !errored && (
        <div
          aria-hidden
          className={cn("absolute inset-0 smart-image-shimmer", radiusClass)}
        />
      )}

      {/* Branded fallback */}
      {(errored || !hasSrc) && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-muted/60",
            radiusClass,
          )}
          aria-hidden
        >
          <Flame className="h-8 w-8 text-primary/70" strokeWidth={1.5} />
        </div>
      )}

      {hasSrc && !errored && (
        <img
          {...rest}
          src={src as string}
          alt={alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error fetchpriority is valid but not in older TS DOM lib
          fetchpriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-300 ease-out",
            objectFit === "cover" ? "object-cover" : "object-contain",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          style={style}
        />
      )}
    </div>
  );
}

export default SmartImage;

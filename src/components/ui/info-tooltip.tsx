import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string | React.ReactNode;
  className?: string;
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  className,
  iconClassName,
  side = "top",
  align = "center",
}) => {
  // Controlled open state: Radix suppresses focus-open when focus comes from a
  // pointer, which makes uncontrolled tooltips untappable on touch devices.
  // Toggling on click keeps desktop hover/focus intact (via onOpenChange) while
  // letting mobile users tap to open/close.
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            onTouchEnd={(e) => {
              // Radix suppresses the synthesized click after touch; toggle here
              // and preventDefault so a late click doesn't double-toggle.
              e.preventDefault();
              setOpen((prev) => !prev);
            }}
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              className
            )}
            aria-label="More information"
            aria-expanded={open}
          >
            <Info className={cn("h-4 w-4", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className="max-w-xs text-sm"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const CTA_PRIMARY =
  "bg-cta-primary text-white border-0 font-bold rounded-2xl shadow-cta-primary hover:opacity-95 active:scale-[0.99] transition-all duration-200";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        /** Vendibook primary conversion CTA — source of truth: listing detail "Buy now". */
        cta: CTA_PRIMARY,
        /** Neutral companion to `cta` — matches the listing page outline treatment. */
        "cta-outline":
          "rounded-2xl border border-border bg-transparent font-semibold text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.99]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-white/25",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /** Legacy aliases — folded into the single Vendibook CTA system. */
        gradient: CTA_PRIMARY,
        "gradient-premium": CTA_PRIMARY,
        "dark-shine": "relative overflow-hidden bg-gradient-to-r from-foreground via-foreground/90 to-foreground text-background font-semibold shadow-lg border-2 border-foreground/15 hover:border-foreground/25 before:absolute before:inset-0 before:w-[200%] before:bg-gradient-to-r before:from-transparent before:via-background/25 before:to-transparent before:-left-full hover:before:animate-premium-shimmer hover:shadow-xl transition-all duration-200",
        "glass-cta": "relative overflow-hidden bg-white/[0.04] backdrop-blur-xl border-2 border-white/[0.12] hover:border-foreground/35 text-foreground font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_4px_24px_-4px_rgba(0,0,0,0.4)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_-4px_rgba(255,255,255,0.08)] hover:bg-white/[0.06] before:absolute before:inset-0 before:w-full before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 before:ease-out transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        /** Full-height conversion CTA sizing (listing detail "Buy now"). */
        cta: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

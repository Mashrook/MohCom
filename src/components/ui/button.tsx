import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-cairo",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(43_66%_52%/0.2)] hover:shadow-[0_0_30px_hsl(43_66%_52%/0.4)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        golden: "bg-gradient-to-l from-[hsl(43,66%,52%)] to-[hsl(48,90%,60%)] text-[hsl(222,47%,10%)] hover:shadow-[0_0_40px_hsl(43_66%_52%/0.5)] hover:-translate-y-0.5 shadow-[0_0_20px_hsl(43_66%_52%/0.3)]",
        "golden-outline": "border-2 border-primary text-primary hover:bg-primary/10 hover:shadow-[0_0_20px_hsl(43_66%_52%/0.3)]",
        hero: "bg-gradient-to-l from-[hsl(43,66%,52%)] to-[hsl(48,90%,60%)] text-[hsl(222,47%,10%)] text-lg px-8 py-6 hover:shadow-[0_0_40px_hsl(43_66%_52%/0.5)] hover:-translate-y-1 shadow-[0_0_20px_hsl(43_66%_52%/0.3)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

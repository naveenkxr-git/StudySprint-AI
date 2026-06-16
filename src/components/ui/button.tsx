import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "gradient";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer",
          {
            "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20": variant === "default",
            "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/15": variant === "destructive",
            "border border-white/10 bg-transparent hover:bg-white/5 text-white": variant === "outline",
            "bg-white/10 text-white hover:bg-white/15 backdrop-blur-md": variant === "secondary",
            "text-white hover:bg-white/5": variant === "ghost",
            "text-primary underline-offset-4 hover:underline p-0": variant === "link",
            "bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-lg shadow-primary/20": variant === "gradient",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3 text-xs": size === "sm",
            "h-11 rounded-md px-8 text-base": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

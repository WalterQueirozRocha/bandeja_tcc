import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm text-brand-navy shadow-2xs transition-colors placeholder:text-secondary focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

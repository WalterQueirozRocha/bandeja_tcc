import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 items-center justify-center", className)}>
      <input
        type="checkbox"
        data-slot="checkbox"
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className="inline-flex size-4 items-center justify-center rounded-[4px] border border-borda bg-surface-card text-white shadow-2xs transition-all peer-checked:border-brand-primary peer-checked:bg-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-royal/30 peer-disabled:opacity-50 [&_svg]:scale-0 [&_svg]:opacity-0 peer-checked:[&_svg]:scale-100 peer-checked:[&_svg]:opacity-100"
      >
        <Check className="size-3 stroke-[3] transition-all duration-150" />
      </span>
    </span>
  );
}

function Radio({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0 items-center justify-center", className)}>
      <input
        type="radio"
        data-slot="radio"
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden="true"
        className="inline-flex size-4 items-center justify-center rounded-full border border-borda bg-surface-card shadow-2xs transition-all peer-checked:border-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-royal/30 peer-disabled:opacity-50 [&_span]:scale-0 peer-checked:[&_span]:scale-100"
      >
        <span className="size-2 rounded-full bg-brand-primary transition-transform duration-150" />
      </span>
    </span>
  );
}

export { Checkbox, Radio };

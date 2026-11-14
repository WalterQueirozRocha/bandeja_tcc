import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function Card({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="card"
      className={cn("flex flex-col gap-4 rounded-xl border border-borda bg-surface-card p-5 text-brand-navy shadow-xs", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function CardTitle({ className, asChild = false, ...props }: React.ComponentProps<"h2"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "h2";
  return <Comp data-slot="card-title" className={cn("font-heading text-lg font-bold leading-snug tracking-tight text-brand-navy", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-sm text-secondary", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex flex-col gap-3", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex flex-wrap items-center gap-2 border-t border-borda pt-3", className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

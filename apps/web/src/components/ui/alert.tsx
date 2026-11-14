import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-lg border-l-4 p-3.5 text-sm shadow-2xs", {
  variants: {
    variant: {
      default: "border-borda bg-surface-card text-brand-navy",
      compativel: "border-compativel bg-compativel-fundo text-compativel-texto",
      atencao: "border-atencao bg-atencao-fundo text-atencao-texto",
      bloqueado: "border-bloqueado bg-bloqueado-fundo text-bloqueado-texto",
      aviso: "border-aviso bg-aviso-fundo text-aviso-texto",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("font-bold tracking-tight uppercase", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("flex flex-1 flex-col gap-1 text-sm leading-relaxed", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants };

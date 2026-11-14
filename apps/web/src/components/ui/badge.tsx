import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap shrink-0 [&_svg]:size-3 [&_svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-primary text-white",
        secondary: "border-borda bg-surface-muted text-secondary",
        outline: "border-borda bg-surface-card text-secondary",
        compativel: "border-2 border-compativel bg-compativel-fundo text-compativel-texto uppercase",
        atencao: "border-2 border-atencao bg-atencao-fundo text-atencao-texto uppercase",
        bloqueado: "border-2 border-bloqueado bg-bloqueado-fundo text-bloqueado-texto uppercase",
        aviso: "border-2 border-aviso bg-aviso-fundo text-aviso-texto uppercase",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

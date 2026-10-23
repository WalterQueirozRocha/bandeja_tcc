import Image from "next/image";

// Versão horizontal (manual 2.1/2.2): o texto fica em HTML para usar as fontes da marca e seguir o tema.
export function Logo({ grande = false }: { grande?: boolean }) {
  const lado = grande ? 64 : 40;
  return (
    <span className="inline-flex items-center gap-3">
      <Image src="/logo-bandeja-icone.svg" alt="" width={lado} height={lado} unoptimized className="logo-icone" />
      <span className="flex flex-col leading-none">
        <span className={`font-heading font-extrabold tracking-tight text-brand-navy ${grande ? "text-4xl" : "text-xl"}`}>
          BANDEJA
        </span>
        <span className={`font-semibold text-logo-sub ${grande ? "mt-1 text-base" : "text-xs"}`}>Cantina Inteligente</span>
      </span>
    </span>
  );
}

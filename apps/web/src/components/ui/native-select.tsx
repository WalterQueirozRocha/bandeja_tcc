"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Opcao = { valor: string; rotulo: string; disabled?: boolean; grupo?: string };

function extrairOpcoes(children: React.ReactNode, grupoAtual?: string): Opcao[] {
  const lista: Opcao[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option") {
      const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      const rotulo = React.Children.toArray(props.children).join("");
      const valor = props.value !== undefined ? String(props.value) : rotulo;
      lista.push({ valor, rotulo, disabled: props.disabled, grupo: grupoAtual });
    } else if (child.type === "optgroup") {
      const props = child.props as { label?: string; children?: React.ReactNode };
      lista.push(...extrairOpcoes(props.children, props.label));
    } else if (typeof child.props === "object" && child.props !== null && "children" in child.props) {
      lista.push(...extrairOpcoes((child.props as { children?: React.ReactNode }).children, grupoAtual));
    }
  });
  return lista;
}

function dispararChangeSelect(el: HTMLSelectElement, valorAnterior: string, novoValor: string) {
  const tracker = (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
  tracker?.setValue(valorAnterior);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  setter?.call(el, novoValor);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function NativeSelect({ className, children, value, defaultValue, onChange, disabled, ...props }: React.ComponentProps<"select">) {
  const listboxId = React.useId();
  const opcoes = React.useMemo(() => extrairOpcoes(children), [children]);
  const padraoTexto = defaultValue !== undefined ? String(defaultValue) : (opcoes[0]?.valor ?? "");
  const [estadoInterno, setEstadoInterno] = React.useState<{ padrao: string; valor: string }>({
    padrao: padraoTexto,
    valor: padraoTexto,
  });
  const [aberto, setAberto] = React.useState(false);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const selectRef = React.useRef<HTMLSelectElement>(null);

  React.useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  const valorNaoControlado = estadoInterno.padrao === padraoTexto ? estadoInterno.valor : padraoTexto;
  const valorAtivo = value !== undefined ? String(value) : valorNaoControlado;
  const opcaoAtiva = opcoes.find((o) => o.valor === valorAtivo) ?? opcoes[0];

  function selecionar(novoValor: string) {
    const anterior = valorAtivo;
    setEstadoInterno({ padrao: padraoTexto, valor: novoValor });
    setAberto(false);
    if (selectRef.current && anterior !== novoValor) {
      dispararChangeSelect(selectRef.current, anterior, novoValor);
    }
  }

  return (
    <span ref={containerRef} className={cn("relative inline-flex w-full items-center", className)}>
      <select
        ref={selectRef}
        data-slot="native-select"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        onChange={(e) => {
          setEstadoInterno({ padrao: padraoTexto, valor: e.target.value });
          onChange?.(e);
        }}
        className="pointer-events-none absolute inset-0 m-0 size-full opacity-0"
        tabIndex={-1}
        {...props}
      >
        {children}
      </select>

      <div
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setAberto((v) => !v);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm font-normal text-brand-navy shadow-2xs transition-colors select-none hover:border-brand-royal/60 focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/20 focus:outline-none",
          aberto && "border-brand-royal ring-2 ring-brand-royal/20",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
        )}
      >
        <span className="truncate">{opcaoAtiva?.rotulo ?? "Selecione…"}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-secondary transition-transform duration-150", aberto && "rotate-180")}
        />
      </div>

      {aberto && (
        <div
          id={listboxId}
          role="listbox"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-[calc(100%+0.3rem)] left-0 z-50 max-h-64 min-w-full w-max max-w-[min(90vw,24rem)] overflow-y-auto rounded-xl border border-borda bg-surface-card p-1 text-brand-navy shadow-lg"
        >
          {opcoes.map((o, idx) => {
            const ativo = o.valor === valorAtivo;
            const mostrarGrupo = Boolean(o.grupo && o.grupo !== opcoes[idx - 1]?.grupo);
            return (
              <React.Fragment key={`${o.grupo ?? ""}:${o.valor}`}>
                {mostrarGrupo && (
                  <div className="mt-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary first:mt-0">
                    {o.grupo}
                  </div>
                )}
                <div
                  role="option"
                  aria-selected={ativo}
                  aria-disabled={o.disabled}
                  onClick={() => !o.disabled && selecionar(o.valor)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors select-none",
                    ativo ? "bg-brand-royal/10 font-semibold text-brand-royal" : "font-normal text-brand-navy hover:bg-surface-hover",
                    o.disabled && "pointer-events-none opacity-45",
                  )}
                >
                  <span className="truncate">{o.rotulo}</span>
                  <Check aria-hidden="true" className={cn("size-4 shrink-0 text-brand-royal", ativo ? "opacity-100" : "opacity-0")} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </span>
  );
}

export { NativeSelect };

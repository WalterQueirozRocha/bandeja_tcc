"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function hojeIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatarBr(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function extrairAnoMes(iso: string): { ano: number; mes: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [a, m] = iso.split("-").map(Number);
    return { ano: a!, mes: m! - 1 };
  }
  const h = hojeIso();
  const [a, m] = h.split("-").map(Number);
  return { ano: a!, mes: m! - 1 };
}

function montarIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function gradeDoMes(ano: number, mes: number): { iso: string; dia: number; mesAtual: boolean }[] {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
  const totalDiasMesAnterior = new Date(ano, mes, 0).getDate();

  const celulas: { iso: string; dia: number; mesAtual: boolean }[] = [];

  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const dia = totalDiasMesAnterior - i;
    const dataAnt = new Date(ano, mes - 1, dia);
    celulas.push({
      iso: montarIso(dataAnt.getFullYear(), dataAnt.getMonth(), dataAnt.getDate()),
      dia,
      mesAtual: false,
    });
  }

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    celulas.push({
      iso: montarIso(ano, mes, dia),
      dia,
      mesAtual: true,
    });
  }

  const restantes = (7 - (celulas.length % 7)) % 7;
  for (let dia = 1; dia <= restantes; dia++) {
    const dataProx = new Date(ano, mes + 1, dia);
    celulas.push({
      iso: montarIso(dataProx.getFullYear(), dataProx.getMonth(), dataProx.getDate()),
      dia,
      mesAtual: false,
    });
  }

  return celulas;
}

// Atualiza o input oculto mantendo o ciclo de change do React e formulários nativos.
export function dispararChangeInput(el: HTMLInputElement, valorAnterior: string, novoValor: string) {
  const tracker = (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
  tracker?.setValue(valorAnterior);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, novoValor);
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export function useFecharPopover(aberto: boolean, containerRef: React.RefObject<HTMLElement | null>, aoFechar: () => void) {
  React.useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        aoFechar();
      }
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto, aoFechar, containerRef]);
}

export function CalendarioMensal({
  ano,
  mes,
  dataSelecionada,
  hoje,
  min,
  max,
  aoNavegarMes,
  aoSelecionarData,
}: {
  ano: number;
  mes: number;
  dataSelecionada: string;
  hoje: string;
  min?: string;
  max?: string;
  aoNavegarMes: (delta: number) => void;
  aoSelecionarData: (iso: string) => void;
}) {
  const celulas = React.useMemo(() => gradeDoMes(ano, mes), [ano, mes]);
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div
          role="button"
          aria-label="Mês anterior"
          onClick={() => aoNavegarMes(-1)}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-borda bg-surface-card text-secondary transition-colors hover:bg-surface-hover hover:text-brand-navy"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </div>
        <span className="font-heading text-sm font-bold text-brand-navy">
          {MESES[mes]} {ano}
        </span>
        <div
          role="button"
          aria-label="Próximo mês"
          onClick={() => aoNavegarMes(1)}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border border-borda bg-surface-card text-secondary transition-colors hover:bg-surface-hover hover:text-brand-navy"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-secondary">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-xs tabular-nums">
        {celulas.map((c) => {
          const selecionado = c.iso === dataSelecionada;
          const ehHoje = c.iso === hoje;
          const bloqueado = Boolean((min && c.iso < min) || (max && c.iso > max));
          return (
            <div
              key={c.iso}
              role="button"
              aria-disabled={bloqueado}
              aria-pressed={selecionado}
              onClick={() => !bloqueado && aoSelecionarData(c.iso)}
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center rounded-lg font-medium transition-colors",
                !c.mesAtual && "text-secondary/50",
                c.mesAtual && !selecionado && "text-brand-navy hover:bg-surface-hover",
                ehHoje && !selecionado && "border border-brand-royal/50 font-bold text-brand-royal",
                selecionado && "bg-brand-primary font-bold text-white shadow-2xs",
                bloqueado && "pointer-events-none opacity-30",
              )}
            >
              {c.dia}
            </div>
          );
        })}
      </div>
    </>
  );
}

type DatePickerProps = Omit<React.ComponentProps<"input">, "type"> & {
  placeholder?: string;
  limpar?: boolean;
};

function DatePicker({
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  min,
  max,
  placeholder = "Selecionar data",
  limpar = false,
  ...props
}: DatePickerProps) {
  const dialogId = React.useId();
  const padraoTexto = defaultValue !== undefined ? String(defaultValue) : "";
  const [estadoInterno, setEstadoInterno] = React.useState<{ padrao: string; valor: string }>({
    padrao: padraoTexto,
    valor: padraoTexto,
  });
  const [aberto, setAberto] = React.useState(false);

  const valorNaoControlado = estadoInterno.padrao === padraoTexto ? estadoInterno.valor : padraoTexto;
  const valorAtivo = value !== undefined ? String(value) : valorNaoControlado;
  const [{ ano, mes }, setVisao] = React.useState(() => extrairAnoMes(valorAtivo));

  const containerRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fechar = React.useCallback(() => setAberto(false), []);
  useFecharPopover(aberto, containerRef, fechar);

  function alternarCalendario(proximoEstado?: boolean) {
    const vaiAbrir = proximoEstado ?? !aberto;
    if (vaiAbrir && valorAtivo) {
      setVisao(extrairAnoMes(valorAtivo));
    }
    setAberto(vaiAbrir);
  }

  function escolherData(novoIso: string) {
    const anterior = valorAtivo;
    setEstadoInterno({ padrao: padraoTexto, valor: novoIso });
    setAberto(false);
    if (inputRef.current && anterior !== novoIso) {
      dispararChangeInput(inputRef.current, anterior, novoIso);
    }
  }

  function navegarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setVisao({ ano: d.getFullYear(), mes: d.getMonth() });
  }

  const hoje = hojeIso();
  const textoExibido = formatarBr(valorAtivo);

  return (
    <span ref={containerRef} className={cn("relative inline-flex w-full items-center", className)}>
      <input
        ref={inputRef}
        type="date"
        data-slot="date-picker-input"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        onChange={(e) => {
          setEstadoInterno({ padrao: padraoTexto, valor: e.target.value });
          onChange?.(e);
        }}
        className="pointer-events-none absolute inset-0 m-0 size-full opacity-0"
        tabIndex={-1}
        {...props}
      />

      <div
        role="combobox"
        aria-controls={dialogId}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) alternarCalendario();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            alternarCalendario(true);
          }
        }}
        className={cn(
          "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-borda bg-surface-card px-3 py-1.5 text-sm font-normal text-brand-navy shadow-2xs transition-colors select-none hover:border-brand-royal/60 focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/20 focus:outline-none",
          aberto && "border-brand-royal ring-2 ring-brand-royal/20",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
        )}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0 text-brand-royal" />
          <span className={cn("tabular-nums", !textoExibido && "text-secondary")}>{textoExibido || placeholder}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          {limpar && textoExibido && (
            <span
              role="button"
              aria-label="Limpar data"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                escolherData("");
              }}
              className="rounded p-0.5 text-secondary hover:bg-surface-hover hover:text-brand-navy"
            >
              <X aria-hidden="true" className="size-3.5" />
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-secondary transition-transform duration-150", aberto && "rotate-180")}
          />
        </span>
      </div>

      {aberto && (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Calendário"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-[calc(100%+0.35rem)] left-0 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-borda bg-surface-card p-3 text-brand-navy shadow-lg select-none"
        >
          <CalendarioMensal
            ano={ano}
            mes={mes}
            dataSelecionada={valorAtivo}
            hoje={hoje}
            min={typeof min === "string" ? min : undefined}
            max={typeof max === "string" ? max : undefined}
            aoNavegarMes={navegarMes}
            aoSelecionarData={escolherData}
          />

          <div className="mt-2.5 flex items-center justify-between border-t border-borda pt-2 text-xs">
            <div
              role="button"
              onClick={() => escolherData(hoje)}
              className="cursor-pointer rounded-md px-2 py-1 font-semibold text-brand-royal hover:bg-brand-royal/10"
            >
              Hoje
            </div>
            {(limpar || !required) && valorAtivo && (
              <div
                role="button"
                onClick={() => escolherData("")}
                className="cursor-pointer rounded-md px-2 py-1 font-medium text-secondary hover:bg-surface-hover hover:text-brand-navy"
              >
                Limpar
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

export { DatePicker };

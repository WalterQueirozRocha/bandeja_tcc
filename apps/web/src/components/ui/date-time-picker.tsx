"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDown, Clock } from "lucide-react";
import { CalendarioMensal, dispararChangeInput, extrairAnoMes, hojeIso, useFecharPopover } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

function agoraLocalIso(): string {
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T");
  return partes.slice(0, 16);
}

function separarDataHora(valor: string): { data: string; hora: string; minuto: string } {
  const base = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor) ? valor.slice(0, 16) : agoraLocalIso();
  const [data, horario] = base.split("T");
  const [hora, minuto] = (horario ?? "12:00").split(":");
  return {
    data: data ?? base.slice(0, 10),
    hora: (hora ?? "12").padStart(2, "0"),
    minuto: (minuto ?? "00").padStart(2, "0"),
  };
}

function formatarDataHoraBr(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) return "";
  const { data, hora, minuto } = separarDataHora(valor);
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a} às ${hora}:${minuto}`;
}

type DateTimePickerProps = Omit<React.ComponentProps<"input">, "type">;

function DateTimePicker({ className, value, defaultValue, onChange, disabled, required, ...props }: DateTimePickerProps) {
  const dialogId = React.useId();
  const padraoTexto = defaultValue !== undefined ? String(defaultValue) : "";
  const [estadoInterno, setEstadoInterno] = React.useState<{ padrao: string; valor: string }>({
    padrao: padraoTexto,
    valor: padraoTexto,
  });
  const [aberto, setAberto] = React.useState(false);

  const valorNaoControlado = estadoInterno.padrao === padraoTexto ? estadoInterno.valor : padraoTexto;
  const valorAtivo = value !== undefined ? String(value) : valorNaoControlado;
  const { data: dataAtiva, hora: horaAtiva, minuto: minutoAtivo } = separarDataHora(valorAtivo);
  const [{ ano, mes }, setVisao] = React.useState(() => extrairAnoMes(dataAtiva));

  const containerRef = React.useRef<HTMLSpanElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const fechar = React.useCallback(() => setAberto(false), []);
  useFecharPopover(aberto, containerRef, fechar);

  function alternarCalendario(proximoEstado?: boolean) {
    const vaiAbrir = proximoEstado ?? !aberto;
    if (vaiAbrir && dataAtiva) {
      setVisao(extrairAnoMes(dataAtiva));
    }
    setAberto(vaiAbrir);
  }

  function atualizarValor(novoValor: string, fecharDepois = false) {
    const anterior = valorAtivo;
    setEstadoInterno({ padrao: padraoTexto, valor: novoValor });
    if (fecharDepois) setAberto(false);
    if (inputRef.current && anterior !== novoValor) {
      dispararChangeInput(inputRef.current, anterior, novoValor);
    }
  }

  function navegarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1);
    setVisao({ ano: d.getFullYear(), mes: d.getMonth() });
  }

  function ajustarHora(delta: number) {
    const novaHora = (Number(horaAtiva) + delta + 24) % 24;
    atualizarValor(`${dataAtiva}T${String(novaHora).padStart(2, "0")}:${minutoAtivo}`);
  }

  function ajustarMinuto(delta: number) {
    const novoMin = (Number(minutoAtivo) + delta + 60) % 60;
    atualizarValor(`${dataAtiva}T${horaAtiva}:${String(novoMin).padStart(2, "0")}`);
  }

  const hoje = hojeIso();
  const textoExibido = formatarDataHoraBr(valorAtivo);

  return (
    <span ref={containerRef} className={cn("relative inline-flex w-full items-center", className)}>
      <input
        ref={inputRef}
        type="datetime-local"
        data-slot="date-time-picker-input"
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        required={required}
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
          <span className={cn("tabular-nums", !textoExibido && "text-secondary")}>
            {textoExibido || "Selecionar data e hora"}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-secondary transition-transform duration-150", aberto && "rotate-180")}
        />
      </div>

      {aberto && (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Calendário e horário"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-[calc(100%+0.35rem)] left-0 z-50 w-76 max-w-[calc(100vw-2rem)] rounded-xl border border-borda bg-surface-card p-3.5 text-brand-navy shadow-lg select-none"
        >
          <CalendarioMensal
            ano={ano}
            mes={mes}
            dataSelecionada={valorAtivo ? dataAtiva : ""}
            hoje={hoje}
            aoNavegarMes={navegarMes}
            aoSelecionarData={(iso) => atualizarValor(`${iso}T${horaAtiva}:${minutoAtivo}`)}
          />

          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-borda bg-surface-muted/60 px-2.5 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary">
              <Clock aria-hidden="true" className="size-3.5 text-brand-royal" />
              Horário
            </span>
            <div className="flex items-center gap-1 text-xs tabular-nums">
              <div className="inline-flex items-center rounded-md border border-borda bg-surface-card">
                <div
                  role="button"
                  aria-label="Diminuir hora"
                  onClick={() => ajustarHora(-1)}
                  className="cursor-pointer px-1.5 py-1 text-secondary hover:bg-surface-hover hover:text-brand-navy"
                >
                  −
                </div>
                <span className="w-6 text-center font-bold text-brand-navy">{horaAtiva}</span>
                <div
                  role="button"
                  aria-label="Aumentar hora"
                  onClick={() => ajustarHora(1)}
                  className="cursor-pointer px-1.5 py-1 text-secondary hover:bg-surface-hover hover:text-brand-navy"
                >
                  +
                </div>
              </div>
              <span className="font-bold text-secondary">:</span>
              <div className="inline-flex items-center rounded-md border border-borda bg-surface-card">
                <div
                  role="button"
                  aria-label="Diminuir minuto"
                  onClick={() => ajustarMinuto(-5)}
                  className="cursor-pointer px-1.5 py-1 text-secondary hover:bg-surface-hover hover:text-brand-navy"
                >
                  −
                </div>
                <span className="w-6 text-center font-bold text-brand-navy">{minutoAtivo}</span>
                <div
                  role="button"
                  aria-label="Aumentar minuto"
                  onClick={() => ajustarMinuto(5)}
                  className="cursor-pointer px-1.5 py-1 text-secondary hover:bg-surface-hover hover:text-brand-navy"
                >
                  +
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-borda pt-2 text-xs">
            <div
              role="button"
              onClick={() => atualizarValor(agoraLocalIso(), true)}
              className="cursor-pointer rounded-md px-2 py-1 font-semibold text-brand-royal hover:bg-brand-royal/10"
            >
              Agora
            </div>
            <div
              role="button"
              onClick={() => setAberto(false)}
              className="cursor-pointer rounded-md bg-brand-primary px-2.5 py-1 font-semibold text-white hover:bg-brand-primary-hover"
            >
              Concluir
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

export { DateTimePicker };

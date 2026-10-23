"use client";

import { useState } from "react";
import { MensagemErro, useAcao } from "@/components/acao";
import { GRUPO_ALIMENTAR, MODO_PREPARO, opcoes } from "@/lib/rotulos";

type Fator = { id: number; grupo_alimentar: string; modo_preparo: string; fator_coccao: number; referencia: string };

const MODOS = opcoes(MODO_PREPARO).filter((o) => o.valor !== "CRU");
const REFERENCIA_PADRAO = "Domene (2018)";

// M1: novo fator (um por grupo e modo; cru usa sempre 1).
export function NovoFator() {
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({ grupo_alimentar: "CEREAIS", modo_preparo: "COZIDO", fator_coccao: "", referencia: REFERENCIA_PADRAO });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await executar("/api/fatores", "POST", { ...dados, fator_coccao: Number(dados.fator_coccao.replace(",", ".")) });
    if (ok) setDados({ ...dados, fator_coccao: "" });
  }

  return (
    <form onSubmit={salvar} className="cartao flex flex-col gap-3">
      <h2>Novo fator</h2>
      <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Grupo
          <select value={dados.grupo_alimentar} onChange={(e) => setDados({ ...dados, grupo_alimentar: e.target.value })} className="campo">
            {opcoes(GRUPO_ALIMENTAR).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Modo
          <select value={dados.modo_preparo} onChange={(e) => setDados({ ...dados, modo_preparo: e.target.value })} className="campo">
            {MODOS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Fator
          <input inputMode="decimal" value={dados.fator_coccao} onChange={(e) => setDados({ ...dados, fator_coccao: e.target.value })} required className="campo tabular-nums" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Referência
          <input value={dados.referencia} onChange={(e) => setDados({ ...dados, referencia: e.target.value })} required className="campo" />
        </label>
      </div>
      <button type="submit" disabled={ocupado} className="btn-primario self-start">
        Adicionar fator
      </button>
      <MensagemErro erro={erro} />
    </form>
  );
}

// Edita o valor e a referência; remover é recusado se alguma preparação depende do fator.
export function LinhaFator({ fator }: { fator: Fator }) {
  const { erro, ocupado, executar } = useAcao();
  const [valor, setValor] = useState(String(fator.fator_coccao));
  const [referencia, setReferencia] = useState(fator.referencia);
  const [aviso, setAviso] = useState("");

  async function salvar() {
    const ok = await executar(`/api/fatores/${fator.id}`, "PUT", { ...fator, fator_coccao: Number(valor.replace(",", ".")), referencia });
    setAviso(ok ? "Salvo." : "");
  }

  return (
    <li className="cartao flex flex-col gap-2 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_1fr_auto_auto] sm:items-end">
        <span className="font-semibold sm:pb-2">
          {GRUPO_ALIMENTAR[fator.grupo_alimentar]} · {MODO_PREPARO[fator.modo_preparo]}
        </span>
        <label className="flex flex-col gap-1 text-sm">
          Fator
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="campo tabular-nums" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Referência
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} className="campo" />
        </label>
        <button type="button" disabled={ocupado} onClick={salvar} className="btn-secundario">
          Salvar
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => confirm("Remover este fator? O modo deixa de ser oferecido para o grupo.") && executar(`/api/fatores/${fator.id}`, "DELETE")}
          className="btn-secundario"
        >
          Remover
        </button>
      </div>
      {aviso && <span role="status" className="text-sm">{aviso}</span>}
      <MensagemErro erro={erro} />
    </li>
  );
}

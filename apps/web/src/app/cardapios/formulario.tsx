"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensagemErro, useAcao } from "@/components/acao";
import { PERIODO, opcoes } from "@/lib/rotulos";

type Item = { preparacao_id: number; preco: number };
type Inicial = { id: number; data: string; periodo: string; itens: Item[] };

// RF05: publicar (criar = publicar) e editar. Retirar um item já vendido o desabilita (B3).
export function FormularioCardapio({ preparacoes, inicial, dataPadrao }: { preparacoes: { id: number; nome: string }[]; inicial?: Inicial; dataPadrao: string }) {
  const router = useRouter();
  const { erro, setErro, ocupado, executar } = useAcao();
  const [data, setData] = useState(inicial?.data ?? dataPadrao);
  const [ate, setAte] = useState("");
  const [periodo, setPeriodo] = useState(inicial?.periodo ?? "MANHA");
  const [itens, setItens] = useState<Item[]>(inicial?.itens ?? [{ preparacao_id: 0, preco: 0 }]);
  const mudar = (i: number, item: Partial<Item>) => setItens(itens.map((x, j) => (j === i ? { ...x, ...item } : x)));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (itens.some((i) => !i.preparacao_id)) return setErro("Escolha a preparação de cada item.");
    const corpo = { data, periodo, itens };
    const r = inicial
      ? await executar(`/api/cardapios/${inicial.id}`, "PUT", corpo)
      : await executar("/api/cardapios", "POST", { ...corpo, ...(ate && { ate }) });
    if (r) router.push("/cardapios");
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Data
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="campo" />
        </label>
        {!inicial && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Até (opcional)
            <input type="date" value={ate} min={data} onChange={(e) => setAte(e.target.value)} className="campo" />
            <span className="text-xs font-normal text-secondary">Um cardápio por dia útil</span>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Turno
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="campo">
            {opcoes(PERIODO).map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="cartao flex flex-col gap-3">
        <legend className="sr-only">Itens do cardápio</legend>
        <h2>Itens</h2>
        {itens.map((item, i) => (
          <div key={i} className="grid gap-2 border-b border-borda pb-3 last:border-0 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Preparação
              <select value={item.preparacao_id} onChange={(e) => mudar(i, { preparacao_id: Number(e.target.value) })} className="campo">
                <option value={0}>Escolha…</option>
                {preparacoes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Preço (R$)
              <input type="number" min={0} step={0.01} value={item.preco} onChange={(e) => mudar(i, { preco: Number(e.target.value) })} className="campo tabular-nums" />
            </label>
            <button type="button" disabled={itens.length === 1} onClick={() => setItens(itens.filter((_, j) => j !== i))} className="btn-secundario">
              Remover
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setItens([...itens, { preparacao_id: 0, preco: 0 }])} className="btn-secundario self-start">
          Adicionar item
        </button>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={ocupado} className="btn-primario">
          {inicial ? "Salvar alterações" : "Publicar cardápio"}
        </button>
        <button type="button" onClick={() => router.push("/cardapios")} className="btn-secundario">
          Cancelar
        </button>
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

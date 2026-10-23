"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensagemErro, useAcao } from "@/components/acao";
import { BuscaIngrediente } from "@/components/busca-ingrediente";
import { MODO_PREPARO } from "@/lib/rotulos";

type Item = { ingrediente_id: number; nome: string; quantidade_crua_g: number; modo_preparo: string; modos: string[] };
type Contato = { categoria_codigo: string; motivo: string };
export type PreparacaoInicial = { id: number; nome: string; porcao_g: number; itens: Item[]; contato_cozinha: Contato[] };

// RF02/RF03: ficha técnica em peso cru; só os modos com fator (e forma preparada, no FRITO) são oferecidos (P2).
export function FormularioPreparacao({ inicial, categorias }: { inicial?: PreparacaoInicial; categorias: { codigo: string; nome: string }[] }) {
  const router = useRouter();
  const { erro, setErro, ocupado, executar } = useAcao();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [porcao, setPorcao] = useState(inicial?.porcao_g ?? 100);
  const [itens, setItens] = useState<Item[]>(inicial?.itens ?? []);
  const [contatos, setContatos] = useState<Contato[]>(inicial?.contato_cozinha ?? []);
  const [novoContato, setNovoContato] = useState<Contato>({ categoria_codigo: "", motivo: "" });
  const mudar = (i: number, item: Partial<Item>) => setItens(itens.map((x, j) => (j === i ? { ...x, ...item } : x)));

  async function escolher({ id, nome }: { id: number; nome: string }) {
    if (itens.some((i) => i.ingrediente_id === id)) return setErro(`${nome} já está na ficha.`);
    const res = await fetch(`/api/ingredientes/${id}`);
    const modos: string[] = res.ok ? (await res.json()).modos_disponiveis : [];
    if (!modos.length) return setErro(`${nome} é uma forma preparada da TACO: use o ingrediente cru e escolha o modo de preparo.`);
    setErro("");
    setItens([...itens, { ingrediente_id: id, nome, quantidade_crua_g: 100, modo_preparo: modos[0]!, modos }]);
  }

  function adicionarContato() {
    if (!novoContato.categoria_codigo || !novoContato.motivo.trim()) return setErro("Informe a categoria e o motivo do contato na cozinha.");
    if (contatos.some((c) => c.categoria_codigo === novoContato.categoria_codigo)) return setErro("Essa categoria já está na lista.");
    setErro("");
    setContatos([...contatos, { ...novoContato, motivo: novoContato.motivo.trim() }]);
    setNovoContato({ categoria_codigo: "", motivo: "" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!itens.length) return setErro("Adicione pelo menos um ingrediente.");
    const corpo = {
      nome,
      porcao_g: porcao,
      itens: itens.map(({ ingrediente_id, quantidade_crua_g, modo_preparo }) => ({ ingrediente_id, quantidade_crua_g, modo_preparo })),
      contato_cozinha: contatos,
    };
    const r = inicial ? await executar<{ id: number }>(`/api/preparacoes/${inicial.id}`, "PUT", corpo) : await executar<{ id: number }>("/api/preparacoes", "POST", corpo);
    if (r) router.push(`/preparacoes/${r.id}`);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={200} className="campo" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Porção (g)
          <input type="number" min={1} step="any" value={porcao} onChange={(e) => setPorcao(Number(e.target.value))} required className="campo tabular-nums" />
        </label>
      </div>

      <fieldset className="cartao flex flex-col gap-3">
        <legend className="sr-only">Ingredientes</legend>
        <h2>Ingredientes (peso cru)</h2>
        {itens.length === 0 && <p className="text-sm text-secondary">Nenhum ingrediente.</p>}
        {itens.map((item, i) => (
          <div key={item.ingrediente_id} className="grid gap-2 border-b border-borda pb-3 sm:grid-cols-[1fr_8rem_9rem_auto] sm:items-end">
            <span className="font-medium sm:pb-2">{item.nome}</span>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Peso cru (g)
              <input
                type="number"
                min={0.1}
                step="any"
                value={item.quantidade_crua_g}
                onChange={(e) => mudar(i, { quantidade_crua_g: Number(e.target.value) })}
                className="campo tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Modo de preparo
              <select value={item.modo_preparo} onChange={(e) => mudar(i, { modo_preparo: e.target.value })} className="campo">
                {item.modos.map((m) => (
                  <option key={m} value={m}>
                    {MODO_PREPARO[m]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setItens(itens.filter((_, j) => j !== i))} className="btn-secundario">
              Remover
            </button>
          </div>
        ))}
        <BuscaIngrediente rotulo="Buscar ingrediente para adicionar" onEscolher={escolher} />
        <p className="text-xs text-secondary">Só aparecem os modos com fator de cocção cadastrado; frito exige também a forma frita na TACO.</p>
      </fieldset>

      <fieldset className="cartao flex flex-col gap-3">
        <legend className="sr-only">Contato na cozinha</legend>
        <h2>Pode conter (contato na cozinha)</h2>
        {contatos.map((c) => (
          <div key={c.categoria_codigo} className="flex flex-wrap items-center gap-2 rounded-md border border-atencao bg-atencao-fundo px-2 py-1 text-sm text-atencao-texto">
            <strong className="uppercase">Pode conter:</strong> {categorias.find((x) => x.codigo === c.categoria_codigo)?.nome} <em>({c.motivo})</em>
            <button type="button" onClick={() => setContatos(contatos.filter((x) => x !== c))} className="ml-auto underline">
              Remover
            </button>
          </div>
        ))}
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Categoria
            <select value={novoContato.categoria_codigo} onChange={(e) => setNovoContato({ ...novoContato, categoria_codigo: e.target.value })} className="campo">
              <option value="">Escolha…</option>
              {categorias.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Motivo
            <input value={novoContato.motivo} onChange={(e) => setNovoContato({ ...novoContato, motivo: e.target.value })} maxLength={200} placeholder="Ex.: mesma frigideira do pastel" className="campo" />
          </label>
          <button type="button" onClick={adicionarContato} className="btn-secundario">
            Adicionar
          </button>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={ocupado} className="btn-primario">
          {inicial ? "Salvar ficha" : "Criar preparação"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secundario">
          Cancelar
        </button>
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

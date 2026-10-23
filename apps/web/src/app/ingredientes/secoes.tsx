"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MensagemErro, useAcao } from "@/components/acao";
import { BuscaIngrediente } from "@/components/busca-ingrediente";
import { CATEGORIA_CARBOIDRATO, GRUPO_ALIMENTAR, LISTA_IG, MODO_PREPARO, PRESENCA, opcoes } from "@/lib/rotulos";

type Categoria = { codigo: string; nome: string };
type Marcador = { categoria_codigo: string; presenca: string };

const NUTRIENTES = [
  ["energia_kcal", "Energia (kcal)"],
  ["proteina_g", "Proteína (g)"],
  ["lipideos_g", "Lipídeos (g)"],
  ["carboidrato_g", "Carboidrato (g)"],
  ["fibra_g", "Fibra (g)"],
  ["cinzas_g", "Cinzas (g)"],
  ["umidade_g", "Umidade (g)"],
] as const;

export type DadosRotulo = {
  nome: string;
  grupo_alimentar: string;
  categoria_carboidrato: string;
} & Partial<Record<(typeof NUTRIENTES)[number][0] | "rds_percentual", number | null>>;

const numeroOuNulo = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const texto = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function Selecao({ rotulo, valor, onChange, itens }: { rotulo: string; valor: string; onChange: (v: string) => void; itens: { valor: string; rotulo: string }[] }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {rotulo}
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="campo">
        {itens.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function ListaMarcadores({ lista, setLista, categorias }: { lista: Marcador[]; setLista: (l: Marcador[]) => void; categorias: Categoria[] }) {
  const [novo, setNovo] = useState<Marcador>({ categoria_codigo: "", presenca: "CONTEM" });
  return (
    <div className="flex flex-col gap-2">
      {lista.length === 0 && <p className="text-sm text-secondary">Nenhum marcador.</p>}
      {lista.map((m) => (
        <div
          key={m.categoria_codigo}
          className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
            m.presenca === "CONTEM" ? "border-bloqueado bg-bloqueado-fundo text-bloqueado-texto" : "border-atencao bg-atencao-fundo text-atencao-texto"
          }`}
        >
          <strong className="uppercase">{PRESENCA[m.presenca]}:</strong> {categorias.find((c) => c.codigo === m.categoria_codigo)?.nome}
          <button type="button" onClick={() => setLista(lista.filter((x) => x !== m))} className="ml-auto underline">
            Remover
          </button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Selecao
          rotulo="Categoria"
          valor={novo.categoria_codigo}
          onChange={(v) => setNovo({ ...novo, categoria_codigo: v })}
          itens={[{ valor: "", rotulo: "Escolha…" }, ...categorias.map((c) => ({ valor: c.codigo, rotulo: c.nome }))]}
        />
        <Selecao rotulo="Presença" valor={novo.presenca} onChange={(v) => setNovo({ ...novo, presenca: v })} itens={opcoes(PRESENCA)} />
        <button
          type="button"
          disabled={!novo.categoria_codigo || lista.some((m) => m.categoria_codigo === novo.categoria_codigo)}
          onClick={() => {
            setLista([...lista, novo]);
            setNovo({ ...novo, categoria_codigo: "" });
          }}
          className="btn-secundario"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

// RF01: industrializado pelo rótulo (cadastro, com marcadores) ou edição dos dados (M4).
export function FormularioIngrediente({ id, inicial, categorias }: { id?: number; inicial?: DadosRotulo; categorias: Categoria[] }) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState<DadosRotulo>(inicial ?? { nome: "", grupo_alimentar: "OUTROS_INDUSTRIALIZADOS", categoria_carboidrato: "AMIDO" });
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  const [aviso, setAviso] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (id) {
      if (await executar(`/api/ingredientes/${id}`, "PUT", dados)) setAviso("Dados salvos.");
      return;
    }
    const r = await executar<{ id: number }>("/api/ingredientes", "POST", { ...dados, marcadores });
    if (r) router.push(`/ingredientes/${r.id}`);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nome (como no rótulo)
        <input value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} className="campo" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <Selecao rotulo="Grupo" valor={dados.grupo_alimentar} onChange={(v) => setDados({ ...dados, grupo_alimentar: v })} itens={opcoes(GRUPO_ALIMENTAR)} />
        <Selecao
          rotulo="Carboidrato principal (Rytz)"
          valor={dados.categoria_carboidrato}
          onChange={(v) => setDados({ ...dados, categoria_carboidrato: v })}
          itens={opcoes(CATEGORIA_CARBOIDRATO)}
        />
      </div>
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold">Por 100 g (vazio = não informado no rótulo)</legend>
        {NUTRIENTES.map(([campo, rotulo]) => (
          <label key={campo} className="flex flex-col gap-1 text-sm">
            {rotulo}
            <input inputMode="decimal" value={texto(dados[campo])} onChange={(e) => setDados({ ...dados, [campo]: numeroOuNulo(e.target.value) })} className="campo tabular-nums" />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-sm">
          RDS (%)
          <input inputMode="decimal" value={texto(dados.rds_percentual)} onChange={(e) => setDados({ ...dados, rds_percentual: numeroOuNulo(e.target.value) })} className="campo tabular-nums" />
        </label>
      </fieldset>
      {!id && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">Alergênicos e restrições do rótulo</legend>
          <ListaMarcadores lista={marcadores} setLista={setMarcadores} categorias={categorias} />
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={ocupado} className="btn-primario">
          {id ? "Salvar dados" : "Cadastrar ingrediente"}
        </button>
        {aviso && <span role="status" className="text-sm">{aviso}</span>}
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

// M4 na TACO: só a categoria de carboidrato e o RDS.
export function EdicaoTaco({ id, categoria, rds }: { id: number; categoria: string; rds: number | null }) {
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({ categoria_carboidrato: categoria, rds: texto(rds) });
  const [aviso, setAviso] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
        <Selecao rotulo="Carboidrato principal (Rytz)" valor={dados.categoria_carboidrato} onChange={(v) => setDados({ ...dados, categoria_carboidrato: v })} itens={opcoes(CATEGORIA_CARBOIDRATO)} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          RDS (%)
          <input inputMode="decimal" value={dados.rds} onChange={(e) => setDados({ ...dados, rds: e.target.value })} className="campo tabular-nums" />
        </label>
        <button
          type="button"
          disabled={ocupado}
          onClick={async () => {
            const ok = await executar(`/api/ingredientes/${id}`, "PUT", { categoria_carboidrato: dados.categoria_carboidrato, rds_percentual: numeroOuNulo(dados.rds) });
            setAviso(ok ? "Salvo." : "");
          }}
          className="btn-primario"
        >
          Salvar
        </button>
      </div>
      <p className="text-xs text-secondary">
        Reimportar a TACO volta estes dois campos ao padrão e ao <code>carboidratos.csv</code>: registre a mudança também na planilha.
      </p>
      {aviso && <span role="status" className="text-sm">{aviso}</span>}
      <MensagemErro erro={erro} />
    </div>
  );
}

// Marcadores do ingrediente; na TACO a mudança exige conferência dupla por duas pessoas.
export function EditorMarcadores({ id, taco, inicial, categorias }: { id: number; taco: boolean; inicial: Marcador[]; categorias: Categoria[] }) {
  const { erro, ocupado, executar } = useAcao();
  const [lista, setLista] = useState(inicial);
  const [conferentes, setConferentes] = useState({ conferido_por_1: "", conferido_por_2: "" });
  const [aviso, setAviso] = useState("");

  async function salvar() {
    const marcadores = lista.map((m) => ({ ...m, ...(taco && conferentes) }));
    setAviso((await executar(`/api/ingredientes/${id}/marcadores`, "PUT", { marcadores })) ? "Marcadores salvos." : "");
  }

  return (
    <div className="flex flex-col gap-3">
      <ListaMarcadores lista={lista} setLista={setLista} categorias={categorias} />
      {taco && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Conferido por (1)
            <input value={conferentes.conferido_por_1} onChange={(e) => setConferentes({ ...conferentes, conferido_por_1: e.target.value })} className="campo" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Conferido por (2)
            <input value={conferentes.conferido_por_2} onChange={(e) => setConferentes({ ...conferentes, conferido_por_2: e.target.value })} className="campo" />
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={salvar} disabled={ocupado} className="btn-primario self-start">
          Salvar marcadores
        </button>
        {aviso && <span role="status" className="text-sm">{aviso}</span>}
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}

type Ig = { ig: number; lista: string; item_correspondente: string; justificativa: string; conferido_por_1: string | null; conferido_por_2: string | null };

// M2: IG pareado (Atkinson et al., 2021), com conferência dupla; escala do pão ÷ 1,4.
export function FormularioIg({ id, inicial }: { id: number; inicial: Ig | null }) {
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({
    ig: texto(inicial?.ig ? Math.round(inicial.ig * 10) / 10 : null),
    escala: "GLICOSE",
    lista: inicial?.lista ?? "LISTA_1",
    item_correspondente: inicial?.item_correspondente ?? "",
    justificativa: inicial?.justificativa ?? "",
    conferido_por_1: "",
    conferido_por_2: "",
  });
  const [aviso, setAviso] = useState("");
  const campo = (nome: keyof typeof dados, rotulo: string) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {rotulo}
      <input value={dados[nome]} onChange={(e) => setDados({ ...dados, [nome]: e.target.value })} className="campo" />
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {campo("ig", "IG")}
        <Selecao rotulo="Escala" valor={dados.escala} onChange={(v) => setDados({ ...dados, escala: v })} itens={[{ valor: "GLICOSE", rotulo: "Glicose" }, { valor: "PAO", rotulo: "Pão (÷ 1,4)" }]} />
        <Selecao rotulo="Lista" valor={dados.lista} onChange={(v) => setDados({ ...dados, lista: v })} itens={opcoes(LISTA_IG)} />
      </div>
      {campo("item_correspondente", "Item correspondente na tabela")}
      {campo("justificativa", "Justificativa do pareamento")}
      <div className="grid gap-2 sm:grid-cols-2">
        {campo("conferido_por_1", "Conferido por (1)")}
        {campo("conferido_por_2", "Conferido por (2)")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={ocupado}
          onClick={async () => setAviso((await executar(`/api/ingredientes/${id}/ig`, "PUT", { ...dados, ig: numeroOuNulo(dados.ig) })) ? "IG salvo." : "")}
          className="btn-primario"
        >
          Salvar IG
        </button>
        {inicial && (
          <button
            type="button"
            disabled={ocupado}
            onClick={async () => confirm("Remover o IG pareado?") && setAviso((await executar(`/api/ingredientes/${id}/ig`, "DELETE")) ? "IG removido." : "")}
            className="btn-secundario"
          >
            Remover IG
          </button>
        )}
        {aviso && <span role="status" className="text-sm">{aviso}</span>}
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}

// M3: liga esta forma preparada da TACO ao ingrediente cru.
export function FormaCrua({ id, atual }: { id: number; atual: { id: number; nome: string; modo: string } | null }) {
  const { erro, ocupado, executar } = useAcao();
  const [modo, setModo] = useState(atual?.modo ?? "COZIDO");
  const cozidos = opcoes(MODO_PREPARO).filter((o) => o.valor !== "CRU");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {atual ? (
          <>
            Forma {MODO_PREPARO[atual.modo]?.toLowerCase()} de <strong>{atual.nome}</strong>.
          </>
        ) : (
          "Sem forma crua ligada."
        )}
      </p>
      <Selecao rotulo="Modo de preparo desta forma" valor={modo} onChange={setModo} itens={cozidos} />
      <BuscaIngrediente
        rotulo="Buscar a forma crua na TACO"
        filtro={(i) => i.origem === "TACO" && i.modo_preparo === null && i.id !== id}
        onEscolher={(crua) => executar(`/api/ingredientes/${id}/forma-crua`, "PUT", { forma_crua_id: crua.id, modo_preparo: modo })}
      />
      {atual && (
        <button type="button" disabled={ocupado} onClick={() => executar(`/api/ingredientes/${id}/forma-crua`, "DELETE")} className="btn-secundario self-start">
          Desligar da forma crua
        </button>
      )}
      <MensagemErro erro={erro} />
    </div>
  );
}

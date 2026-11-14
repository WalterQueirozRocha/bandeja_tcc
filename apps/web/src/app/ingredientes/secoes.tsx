"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2Off, Plus, Save, Trash2 } from "lucide-react";
import { MensagemErro, useAcao } from "@/components/acao";
import { BuscaIngrediente } from "@/components/busca-ingrediente";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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

function CampoTexto({ rotulo, valor, onChange, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; dica?: string }) {
  return (
    <Label>
      {rotulo}
      <Input value={valor} onChange={(e) => onChange(e.target.value)} required maxLength={300} placeholder={dica} />
    </Label>
  );
}

function Selecao({
  rotulo,
  valor,
  onChange,
  itens,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  itens: { valor: string; rotulo: string }[];
}) {
  return (
    <Label>
      {rotulo}
      <NativeSelect value={valor} onChange={(e) => onChange(e.target.value)}>
        {itens.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </NativeSelect>
    </Label>
  );
}

function ListaMarcadores({ lista, setLista, categorias }: { lista: Marcador[]; setLista: (l: Marcador[]) => void; categorias: Categoria[] }) {
  const [novo, setNovo] = useState<Marcador>({ categoria_codigo: "", presenca: "CONTEM" });
  return (
    <div className="flex flex-col gap-2.5">
      {lista.length === 0 && <p className="text-sm text-secondary">Nenhum marcador.</p>}
      {lista.map((m) => (
        <div
          key={m.categoria_codigo}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
            m.presenca === "CONTEM"
              ? "border-bloqueado/50 bg-bloqueado-fundo text-bloqueado-texto"
              : "border-atencao/50 bg-atencao-fundo text-atencao-texto"
          }`}
        >
          <strong className="uppercase">{PRESENCA[m.presenca]}:</strong> {categorias.find((c) => c.codigo === m.categoria_codigo)?.nome}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setLista(lista.filter((x) => x !== m))}
            className="ml-auto h-auto p-0 text-current"
          >
            Remover
          </Button>
        </div>
      ))}
      <div className="grid gap-2.5 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Selecao
          rotulo="Categoria"
          valor={novo.categoria_codigo}
          onChange={(v) => setNovo({ ...novo, categoria_codigo: v })}
          itens={[{ valor: "", rotulo: "Escolha…" }, ...categorias.map((c) => ({ valor: c.codigo, rotulo: c.nome }))]}
        />
        <Selecao rotulo="Presença" valor={novo.presenca} onChange={(v) => setNovo({ ...novo, presenca: v })} itens={opcoes(PRESENCA)} />
        <Button
          type="button"
          variant="outline"
          disabled={!novo.categoria_codigo || lista.some((m) => m.categoria_codigo === novo.categoria_codigo)}
          onClick={() => {
            setLista([...lista, novo]);
            setNovo({ ...novo, categoria_codigo: "" });
          }}
        >
          <Plus aria-hidden="true" className="size-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

const ORIGENS_NOVAS = [
  { valor: "ROTULO", rotulo: "Rótulo (industrializado)" },
  { valor: "OUTRA_TABELA", rotulo: "Outra tabela (ex.: TBCA)" },
];

// RF01: cadastro pelo rótulo ou de outra tabela (com marcadores) ou edição dos dados com motivo (M4, 04/11).
export function FormularioIngrediente({
  id,
  inicial,
  categorias,
  origem: origemAtual,
  fonte: fonteAtual,
}: {
  id?: number;
  inicial?: DadosRotulo;
  categorias: Categoria[];
  origem?: string;
  fonte?: string | null;
}) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState<DadosRotulo>(inicial ?? { nome: "", grupo_alimentar: "OUTROS_INDUSTRIALIZADOS", categoria_carboidrato: "AMIDO" });
  const [origem, setOrigem] = useState(origemAtual ?? "ROTULO");
  const [fonte, setFonte] = useState(fonteAtual ?? "");
  const [motivo, setMotivo] = useState("");
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  const [aviso, setAviso] = useState("");
  const outraTabela = origem === "OUTRA_TABELA";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (id) {
      if (await executar(`/api/ingredientes/${id}`, "PUT", { ...dados, ...(outraTabela && { fonte }), motivo })) {
        setAviso("Dados salvos.");
        setMotivo("");
        router.refresh();
      }
      return;
    }
    const r = await executar<{ id: number }>("/api/ingredientes", "POST", { ...dados, origem, ...(outraTabela && { fonte }), marcadores });
    if (r) router.push(`/ingredientes/${r.id}`);
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3.5">
      {!id && <Selecao rotulo="Origem dos dados" valor={origem} onChange={setOrigem} itens={ORIGENS_NOVAS} />}
      {outraTabela && <CampoTexto rotulo="Fonte da composição" valor={fonte} onChange={setFonte} dica="Ex.: TBCA 7.2, código C0001" />}
      <Label>
        {outraTabela ? "Nome (como na tabela de origem)" : "Nome (como no rótulo)"}
        <Input value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} required maxLength={200} />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Selecao rotulo="Grupo" valor={dados.grupo_alimentar} onChange={(v) => setDados({ ...dados, grupo_alimentar: v })} itens={opcoes(GRUPO_ALIMENTAR)} />
        <Selecao
          rotulo="Carboidrato principal (Rytz)"
          valor={dados.categoria_carboidrato}
          onChange={(v) => setDados({ ...dados, categoria_carboidrato: v })}
          itens={opcoes(CATEGORIA_CARBOIDRATO)}
        />
      </div>
      <fieldset className="grid grid-cols-2 gap-2.5 rounded-xl border border-borda bg-surface-muted/40 p-3.5 sm:grid-cols-4">
        <legend className="px-1 text-xs font-semibold text-secondary">
          Por 100 g (vazio = não informado {outraTabela ? "na tabela" : "no rótulo"})
        </legend>
        {NUTRIENTES.map(([campo, rotulo]) => (
          <Label key={campo}>
            {rotulo}
            <Input
              inputMode="decimal"
              value={texto(dados[campo])}
              onChange={(e) => setDados({ ...dados, [campo]: numeroOuNulo(e.target.value) })}
              className="tabular-nums"
            />
          </Label>
        ))}
        <Label>
          RDS (%)
          <Input
            inputMode="decimal"
            value={texto(dados.rds_percentual)}
            onChange={(e) => setDados({ ...dados, rds_percentual: numeroOuNulo(e.target.value) })}
            className="tabular-nums"
          />
        </Label>
      </fieldset>
      {!id && (
        <fieldset className="flex flex-col gap-2.5 rounded-xl border border-borda bg-surface-muted/40 p-3.5">
          <legend className="px-1 text-xs font-semibold text-secondary">
            {outraTabela ? "Alergênicos e restrições" : "Alergênicos e restrições do rótulo"}
          </legend>
          {outraTabela && (
            <p className="text-sm text-secondary">
              Como na TACO, a marcação fica pendente até a conferência dupla, e a ficha técnica só aceita o alimento depois dela.
            </p>
          )}
          <ListaMarcadores lista={marcadores} setLista={setMarcadores} categorias={categorias} />
        </fieldset>
      )}
      {id && <CampoTexto rotulo="Motivo da alteração" valor={motivo} onChange={setMotivo} dica="Ex.: correção conforme o rótulo novo" />}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={ocupado}>
          <Save aria-hidden="true" className="size-4" />
          {id ? "Salvar dados" : "Cadastrar ingrediente"}
        </Button>
        {aviso && (
          <span role="status" className="text-sm font-medium text-brand-navy">
            {aviso}
          </span>
        )}
      </div>
      <MensagemErro erro={erro} />
    </form>
  );
}

export type CampoLivre = { campo: string; valor: number | null; fonte?: string };

// M4 na TACO: a categoria de carboidrato, o RDS e, desde 04/11, os campos que a TACO não analisou (com a fonte).
export function EdicaoTaco({ id, categoria, rds, livres }: { id: number; categoria: string; rds: number | null; livres: CampoLivre[] }) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [dados, setDados] = useState({ categoria_carboidrato: categoria, rds: texto(rds) });
  const [valores, setValores] = useState<Record<string, string>>(Object.fromEntries(livres.map((l) => [l.campo, texto(l.valor)])));
  const [fonte, setFonte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");
  const mudados = livres.filter((l) => numeroOuNulo(valores[l.campo]) !== l.valor);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const complemento = Object.fromEntries(mudados.map((l) => [l.campo, numeroOuNulo(valores[l.campo])]));
    const ok = await executar(`/api/ingredientes/${id}`, "PUT", {
      categoria_carboidrato: dados.categoria_carboidrato,
      rds_percentual: numeroOuNulo(dados.rds),
      ...complemento,
      ...(mudados.length && { fonte }),
      motivo,
    });
    setAviso(ok ? "Salvo." : "");
    if (ok) {
      setMotivo("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3.5">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Selecao
          rotulo="Carboidrato principal (Rytz)"
          valor={dados.categoria_carboidrato}
          onChange={(v) => setDados({ ...dados, categoria_carboidrato: v })}
          itens={opcoes(CATEGORIA_CARBOIDRATO)}
        />
        <Label>
          RDS (%)
          <Input inputMode="decimal" value={dados.rds} onChange={(e) => setDados({ ...dados, rds: e.target.value })} className="tabular-nums" />
        </Label>
      </div>
      {livres.length > 0 && (
        <fieldset className="flex flex-col gap-2.5 rounded-xl border border-borda bg-surface-muted/40 p-3.5">
          <legend className="px-1 text-xs font-semibold text-secondary">Campos que a TACO não analisou (por 100 g)</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {livres.map((l) => (
              <Label key={l.campo}>
                {NUTRIENTES.find(([c]) => c === l.campo)?.[1]}
                <Input
                  inputMode="decimal"
                  value={valores[l.campo]}
                  onChange={(e) => setValores({ ...valores, [l.campo]: e.target.value })}
                  className="tabular-nums"
                />
                {l.fonte && <span className="text-xs font-normal text-secondary">Fonte: {l.fonte}</span>}
              </Label>
            ))}
          </div>
          {mudados.length > 0 && (
            <CampoTexto rotulo="Fonte dos valores preenchidos" valor={fonte} onChange={setFonte} dica="Ex.: TBCA 7.2, código C0001" />
          )}
        </fieldset>
      )}
      <CampoTexto rotulo="Motivo da alteração" valor={motivo} onChange={setMotivo} dica="Ex.: composição ausente na TACO" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={ocupado}>
          <Save aria-hidden="true" className="size-4" />
          Salvar
        </Button>
        {aviso && (
          <span role="status" className="text-sm font-medium text-brand-navy">
            {aviso}
          </span>
        )}
      </div>
      <p className="text-xs text-secondary">
        Reimportar a TACO mantém estes campos; a categoria e o RDS só mudam se o alimento estiver no <code>carboidratos.csv</code>.
      </p>
      <MensagemErro erro={erro} />
    </form>
  );
}

// Marcadores do ingrediente; na TACO o conjunto exige conferência dupla por duas pessoas (D6).
export function EditorMarcadores({ id, taco, inicial, categorias }: { id: number; taco: boolean; inicial: Marcador[]; categorias: Categoria[] }) {
  const router = useRouter();
  const { erro, ocupado, executar } = useAcao();
  const [lista, setLista] = useState(inicial);
  const [conferentes, setConferentes] = useState({ conferido_por_1: "", conferido_por_2: "" });
  const [aviso, setAviso] = useState("");

  async function salvar() {
    const ok = await executar(`/api/ingredientes/${id}/marcadores`, "PUT", { marcadores: lista, ...(taco && conferentes) });
    setAviso(ok ? "Marcadores salvos." : "");
    if (ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <ListaMarcadores lista={lista} setLista={setLista} categorias={categorias} />
      {taco && (
        <p className="text-sm text-secondary">
          A conferência vale para a lista inteira. Salvar sem nenhum marcador registra o alimento como conferido, sem alergênico.
        </p>
      )}
      {taco && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Conferido por (1)
            <Input value={conferentes.conferido_por_1} onChange={(e) => setConferentes({ ...conferentes, conferido_por_1: e.target.value })} />
          </Label>
          <Label>
            Conferido por (2)
            <Input value={conferentes.conferido_por_2} onChange={(e) => setConferentes({ ...conferentes, conferido_por_2: e.target.value })} />
          </Label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={salvar} disabled={ocupado} className="self-start">
          <Save aria-hidden="true" className="size-4" />
          Salvar marcadores
        </Button>
        {aviso && (
          <span role="status" className="text-sm font-medium text-brand-navy">
            {aviso}
          </span>
        )}
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
    <Label>
      {rotulo}
      <Input value={dados[nome]} onChange={(e) => setDados({ ...dados, [nome]: e.target.value })} />
    </Label>
  );

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3 sm:grid-cols-3">
        {campo("ig", "IG")}
        <Selecao
          rotulo="Escala"
          valor={dados.escala}
          onChange={(v) => setDados({ ...dados, escala: v })}
          itens={[
            { valor: "GLICOSE", rotulo: "Glicose" },
            { valor: "PAO", rotulo: "Pão (÷ 1,4)" },
          ]}
        />
        <Selecao rotulo="Lista" valor={dados.lista} onChange={(v) => setDados({ ...dados, lista: v })} itens={opcoes(LISTA_IG)} />
      </div>
      {campo("item_correspondente", "Item correspondente na tabela")}
      {campo("justificativa", "Justificativa do pareamento")}
      <div className="grid gap-3 sm:grid-cols-2">
        {campo("conferido_por_1", "Conferido por (1)")}
        {campo("conferido_por_2", "Conferido por (2)")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={ocupado}
          onClick={async () => setAviso((await executar(`/api/ingredientes/${id}/ig`, "PUT", { ...dados, ig: numeroOuNulo(dados.ig) })) ? "IG salvo." : "")}
        >
          <Save aria-hidden="true" className="size-4" />
          Salvar IG
        </Button>
        {inicial && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={ocupado}>
                <Trash2 aria-hidden="true" className="size-3.5" />
                Remover IG
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover o IG pareado?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sem um IG pareado, a estimativa de carga glicêmica pela FAO/OMS não será calculada nas preparações que utilizam este ingrediente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => setAviso((await executar(`/api/ingredientes/${id}/ig`, "DELETE")) ? "IG removido." : "")}
                  className="bg-bloqueado text-white hover:opacity-90"
                >
                  Remover IG
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {aviso && (
          <span role="status" className="text-sm font-medium text-brand-navy">
            {aviso}
          </span>
        )}
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
    <div className="flex flex-col gap-3.5">
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
        <Button type="button" variant="outline" disabled={ocupado} onClick={() => executar(`/api/ingredientes/${id}/forma-crua`, "DELETE")} className="self-start">
          <Link2Off aria-hidden="true" className="size-3.5" />
          Desligar da forma crua
        </Button>
      )}
      <MensagemErro erro={erro} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { Alerta } from "@/components/alerta";
import { Indicador, PAINEL } from "@/components/indicador";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { CATEGORIA_CARBOIDRATO, GRUPO_ALIMENTAR, LISTA_IG, MODO_PREPARO, ORIGEM_INGREDIENTE, PAPEL, PRESENCA } from "@/lib/rotulos";
import { listarCategorias } from "@/repositories/ingredientes";
import { alteracoesDoIngrediente, COMPOSICAO, detalharIngrediente } from "@/services/ingredientes";
import { EdicaoTaco, EditorMarcadores, FormaCrua, FormularioIg, FormularioIngrediente } from "../secoes";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

const CAMPOS: Record<string, string> = {
  nome: "Nome",
  grupo_alimentar: "Grupo",
  categoria_carboidrato: "Carboidrato principal",
  energia_kcal: "Energia (kcal)",
  proteina_g: "Proteína (g)",
  lipideos_g: "Lipídeos (g)",
  carboidrato_g: "Carboidrato (g)",
  fibra_g: "Fibra (g)",
  cinzas_g: "Cinzas (g)",
  umidade_g: "Umidade (g)",
  rds_percentual: "RDS (%)",
  fonte: "Fonte",
};

function valorDoCampo(campo: string, valor: unknown) {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "number") return num(valor);
  const texto = String(valor);
  if (campo === "grupo_alimentar") return GRUPO_ALIMENTAR[texto] ?? texto;
  if (campo === "categoria_carboidrato") return CATEGORIA_CARBOIDRATO[texto] ?? texto;
  return texto;
}

type CampoAlterado = { campo: string; antes: unknown; depois: unknown; fonte?: string };

// Detalhe do ingrediente para todos. Operador e coordenação editam os dados, com registro (04/11);
// marcadores, IG e a forma crua continuam com o operador (M2–M4).
export default async function Ingrediente({ params }: PageProps<"/ingredientes/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  const id = Number((await params).id);
  const i = Number.isInteger(id) && id > 0 ? await detalharIngrediente(id) : null;
  if (!i) notFound();
  const operador = sessao.papel === "OPERADOR";
  const editor = operador || sessao.papel === "COORDENACAO";
  const taco = i.origem === "TACO";
  const mapeado = i.origem !== "ROTULO"; // TACO e outra tabela: marcação conferida em dupla (D6)
  const complementos = (i.complementos ?? {}) as Record<string, string>;
  const categorias = editor ? (await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome })) : [];
  const alteracoes = editor ? await alteracoesDoIngrediente(id) : [];

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1>{i.nome}</h1>
          <p className="text-sm text-secondary">
            {GRUPO_ALIMENTAR[i.grupo_alimentar]} · {ORIGEM_INGREDIENTE[i.origem]}
            {i.codigo_taco !== null && ` nº ${i.codigo_taco}`} · carboidrato: {CATEGORIA_CARBOIDRATO[i.categoria_carboidrato]}
          </p>
        </div>
        {!i.ativo && <SeloDesabilitado />}
        {operador && <AcoesRegistro url={`/api/ingredientes/${id}`} ativo={i.ativo} nome="este ingrediente" voltarPara="/ingredientes" />}
      </div>

      <section className="cartao flex flex-col gap-3">
        <h2>Composição por 100 g</h2>
        {taco && i.energia_kcal === null && (
          <Alerta estado="AVISO" role="note" data-testid="sem-composicao">
            A TACO não analisou a composição deste alimento (campos com &quot;*&quot; na tabela). Nos cálculos, os valores
            ausentes contam como 0: operador ou coordenação podem preencher os campos com outra fonte, como a TBCA.
          </Alerta>
        )}
        <dl className={`${PAINEL} grid-cols-2 sm:grid-cols-4`}>
          <Indicador rotulo="Energia" valor={`${num(i.energia_kcal)} kcal`} />
          <Indicador rotulo="Carboidrato" valor={`${num(i.carboidrato_g)} g`} destaque />
          <Indicador rotulo="Fibra" valor={`${num(i.fibra_g)} g`} />
          <Indicador rotulo="Proteína" valor={`${num(i.proteina_g)} g`} />
          <Indicador rotulo="Lipídeos" valor={`${num(i.lipideos_g)} g`} />
          <Indicador rotulo="Cinzas" valor={`${num(i.cinzas_g)} g`} />
          <Indicador rotulo="Umidade" valor={`${num(i.umidade_g)} g`} />
          <Indicador rotulo="RDS" valor={i.rds_percentual === null ? "padrão" : `${num(i.rds_percentual)} %`} />
        </dl>
        {i.fonte && <p className="text-sm">Fonte da composição: {i.fonte}</p>}
        {Object.keys(complementos).length > 0 && (
          <p className="text-sm" data-testid="complementos">
            Preenchido fora da TACO:{" "}
            {Object.entries(complementos)
              .map(([campo, fonte]) => `${CAMPOS[campo] ?? campo} (${fonte})`)
              .join(", ")}
          </p>
        )}
        <p className="text-sm text-secondary">
          Modos de preparo disponíveis na ficha:{" "}
          {i.modos_disponiveis.length ? i.modos_disponiveis.map((m) => MODO_PREPARO[m]).join(", ") : "nenhum (é uma forma preparada: use o cru)"}
        </p>
        {i.forma_crua && (
          <p className="text-sm">
            Forma {MODO_PREPARO[i.modo_preparo ?? ""]?.toLowerCase()} de <Link href={`/ingredientes/${i.forma_crua.id}`}>{i.forma_crua.nome}</Link>.
          </p>
        )}
        {i.formas_preparadas.length > 0 && (
          <p className="text-sm">
            Formas preparadas na TACO:{" "}
            {i.formas_preparadas.map((f, n) => (
              <span key={f.id}>
                {n > 0 && ", "}
                <Link href={`/ingredientes/${f.id}`}>{f.nome}</Link>
              </span>
            ))}
          </p>
        )}
      </section>

      <section className="cartao flex flex-col gap-3">
        <h2>Alergênicos e restrições</h2>
        {operador ? (
          <EditorMarcadores
            id={id}
            taco={mapeado}
            categorias={categorias}
            inicial={i.marcadores.map((m) => ({ categoria_codigo: m.categoria_codigo, presenca: m.presenca }))}
          />
        ) : i.marcadores.length === 0 ? (
          <p className="text-secondary">Nenhum marcador.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {i.marcadores.map((m) => (
              <li key={m.categoria_codigo}>
                <strong>{PRESENCA[m.presenca]}:</strong> {m.categoria.nome}
              </li>
            ))}
          </ul>
        )}
        {mapeado &&
          (i.marcacao_conferida_em ? (
            <p className="text-xs text-secondary" data-testid="marcacao-conferida">
              Marcação conferida por {i.marcacao_conferida_por_1} e {i.marcacao_conferida_por_2} em{" "}
              {i.marcacao_conferida_em.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}.
            </p>
          ) : (
            <Alerta estado="ATENCAO" role="note" data-testid="marcacao-pendente">
              Marcação pendente: a ficha técnica não aceita este alimento até a conferência dupla.
            </Alerta>
          ))}
      </section>

      <section className="cartao flex flex-col gap-3">
        <h2>Índice glicêmico pareado</h2>
        {i.valor_ig ? (
          <p className="text-sm tabular-nums">
            IG {num(i.valor_ig.ig)} (escala da glicose) · {LISTA_IG[i.valor_ig.lista]} · {i.valor_ig.item_correspondente}
          </p>
        ) : (
          <p className="text-sm text-secondary">Sem IG pareado: a estimativa FAO/OMS não é calculada para preparações com este ingrediente.</p>
        )}
        {operador && <FormularioIg id={id} inicial={i.valor_ig} />}
      </section>

      {editor && (
        <section className="cartao flex flex-col gap-3">
          <h2>Editar dados</h2>
          {taco ? (
            <EdicaoTaco
              id={id}
              categoria={i.categoria_carboidrato}
              rds={i.rds_percentual}
              livres={COMPOSICAO.filter((c) => i[c] === null || c in complementos).map((c) => ({ campo: c, valor: i[c], fonte: complementos[c] }))}
            />
          ) : (
            <FormularioIngrediente
              id={id}
              categorias={categorias}
              origem={i.origem}
              fonte={i.fonte}
              inicial={{
                nome: i.nome,
                grupo_alimentar: i.grupo_alimentar,
                categoria_carboidrato: i.categoria_carboidrato,
                energia_kcal: i.energia_kcal,
                proteina_g: i.proteina_g,
                lipideos_g: i.lipideos_g,
                carboidrato_g: i.carboidrato_g,
                fibra_g: i.fibra_g,
                cinzas_g: i.cinzas_g,
                umidade_g: i.umidade_g,
                rds_percentual: i.rds_percentual,
              }}
            />
          )}
        </section>
      )}

      {editor && (
        <section className="cartao flex flex-col gap-3" data-testid="historico-alteracoes">
          <h2>Histórico de alterações</h2>
          {alteracoes.length === 0 ? (
            <p className="text-sm text-secondary">Nenhuma alteração registrada{taco ? " (os dados vieram da importação da TACO)" : ""}.</p>
          ) : (
            <ol className="flex flex-col gap-3 text-sm">
              {alteracoes.map((a) => (
                <li key={a.id} className="border-b border-borda pb-2 last:border-0">
                  <p>
                    <strong>{a.acao === "CRIACAO" ? "Cadastro" : "Edição"}</strong> por {a.usuario.nome} ({PAPEL[a.usuario.papel]}) em{" "}
                    {a.criado_em.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {a.motivo && <p className="text-secondary">Motivo: {a.motivo}</p>}
                  <ul className="mt-1 flex flex-col gap-0.5 tabular-nums">
                    {(a.campos as CampoAlterado[]).map((c) => (
                      <li key={c.campo}>
                        {CAMPOS[c.campo] ?? c.campo}: {a.acao === "EDICAO" && `${valorDoCampo(c.campo, c.antes)} → `}
                        {valorDoCampo(c.campo, c.depois)}
                        {c.fonte && ` (fonte: ${c.fonte})`}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {operador && taco && i.formas_preparadas.length === 0 && (
        <section className="cartao flex flex-col gap-3">
          <h2>Forma crua (TACO)</h2>
          <FormaCrua id={id} atual={i.forma_crua && i.modo_preparo ? { id: i.forma_crua.id, nome: i.forma_crua.nome, modo: i.modo_preparo } : null} />
        </section>
      )}
    </main>
  );
}

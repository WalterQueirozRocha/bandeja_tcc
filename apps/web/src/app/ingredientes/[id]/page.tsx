import Link from "next/link";
import { notFound } from "next/navigation";
import { AcoesRegistro, SeloDesabilitado } from "@/components/acao";
import { Alerta } from "@/components/alerta";
import { Indicador, PAINEL } from "@/components/indicador";
import { exigirSessaoNaPagina } from "@/lib/acesso";
import { CATEGORIA_CARBOIDRATO, GRUPO_ALIMENTAR, LISTA_IG, MODO_PREPARO, ORIGEM_INGREDIENTE, PRESENCA } from "@/lib/rotulos";
import { listarCategorias } from "@/repositories/ingredientes";
import { detalharIngrediente } from "@/services/ingredientes";
import { EdicaoTaco, EditorMarcadores, FormaCrua, FormularioIg, FormularioIngrediente } from "../secoes";

const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }));

// Detalhe do ingrediente para todos; o operador edita dados, marcadores, IG e a forma crua (M2–M4).
export default async function Ingrediente({ params }: PageProps<"/ingredientes/[id]">) {
  const sessao = await exigirSessaoNaPagina();
  const id = Number((await params).id);
  const i = Number.isInteger(id) && id > 0 ? await detalharIngrediente(id) : null;
  if (!i) notFound();
  const operador = sessao.papel === "OPERADOR";
  const taco = i.origem === "TACO";
  const categorias = operador ? (await listarCategorias()).map((c) => ({ codigo: c.codigo, nome: c.nome })) : [];

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
            ausentes contam como 0: a equipe deve escolher outra fonte, como a TBCA.
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
            taco={taco}
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
        {taco &&
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

      {operador && (
        <section className="cartao flex flex-col gap-3">
          <h2>Editar dados</h2>
          {taco ? (
            <EdicaoTaco id={id} categoria={i.categoria_carboidrato} rds={i.rds_percentual} />
          ) : (
            <FormularioIngrediente
              id={id}
              categorias={categorias}
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

      {operador && taco && i.formas_preparadas.length === 0 && (
        <section className="cartao flex flex-col gap-3">
          <h2>Forma crua (TACO)</h2>
          <FormaCrua id={id} atual={i.forma_crua && i.modo_preparo ? { id: i.forma_crua.id, nome: i.forma_crua.nome, modo: i.modo_preparo } : null} />
        </section>
      )}
    </main>
  );
}

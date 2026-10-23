import { prisma } from "@bandeja/dados";
import { escreverTabela, lerTabela, numero, planilha } from "@bandeja/dados/src/csv";
import { preparacao } from "@/lib/validacao";
import { codigosCategorias } from "@/repositories/ingredientes";
import { ErroNegocio } from "@/services/erros";
import { calcularAlergenos, salvarPreparacao } from "@/services/preparacoes";
import { contarAcertos, somarAcertos, taxas, type Acertos } from "./metricas";

export const PREFIXO_A1 = "A1 ";
// Pasta das planilhas da A1; configurável para os testes usarem dados de exemplo.
export const PASTA_A1 = planilha("avaliacoes/");
const pct = (t: number | null) => (t === null ? "" : (t * 100).toFixed(1).replace(".", ","));

// Ficha técnica das preparações reais da A1 (uma linha por ingrediente; porção e contato na cozinha na 1ª linha).
export async function importarA1(pasta = PASTA_A1) {
  const linhas = lerTabela(new URL("a1-preparacoes.csv", pasta));
  const porNome = Map.groupBy(linhas, (l) => l.preparacao?.trim() ?? "");
  const ids = new Map(
    (await prisma.ingrediente.findMany({ where: { codigo_taco: { not: null } }, select: { id: true, codigo_taco: true } })).map((i) => [
      i.codigo_taco!,
      i.id,
    ]),
  );
  const erros: string[] = [];
  let importadas = 0;
  for (const [nome, itens] of porNome) {
    if (!nome) continue;
    try {
      const primeira = itens[0]!;
      const dados = preparacao.parse({
        nome: PREFIXO_A1 + nome,
        porcao_g: numero(primeira.porcao_g ?? ""),
        itens: itens.map((l) => {
          const id = ids.get(Number(l.codigo_taco));
          if (!id) throw new Error(`linha ${l.linha}: código TACO ${l.codigo_taco} não importado`);
          return { ingrediente_id: id, quantidade_crua_g: numero(l.quantidade_crua_g ?? ""), modo_preparo: l.modo_preparo };
        }),
        contato_cozinha: (primeira.contato_cozinha ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((categoria_codigo) => ({ categoria_codigo, motivo: "contato na cozinha (A1)" })),
      });
      const existente = await prisma.preparacao.findFirst({ where: { nome: dados.nome }, select: { id: true } });
      await salvarPreparacao(dados, existente?.id);
      importadas++;
    } catch (e) {
      erros.push(`${nome}: ${e instanceof ErroNegocio || e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (erros.length) throw new Error(`a1-preparacoes.csv: ${erros.length} preparação(ões) com erro\n${erros.join("\n")}`);
  return `${importadas} preparações da A1 importadas`;
}

function categoriasPorPreparacao(arquivo: URL) {
  const mapa = new Map<string, Set<string>>();
  for (const l of lerTabela(arquivo)) {
    const prep = l.preparacao?.trim() ?? "";
    if (!mapa.has(prep)) mapa.set(prep, new Set());
    mapa.get(prep)!.add(l.categoria?.trim() ?? "");
  }
  return mapa;
}

// A1: Bandeja e marcação manual comparados ao gabarito. "Sinalizado" = contém ou pode conter (decisão 3 do I6).
export async function avaliarA1(pasta = PASTA_A1) {
  const gabarito = categoriasPorPreparacao(new URL("a1-gabarito.csv", pasta));
  const manual = categoriasPorPreparacao(new URL("a1-manual.csv", pasta));
  if (gabarito.size === 0) throw new Error("a1-gabarito.csv está vazio");
  const preps = await prisma.preparacao.findMany({ where: { nome: { startsWith: PREFIXO_A1 } }, select: { id: true, nome: true } });
  const noBandeja = new Map(preps.map((p) => [p.nome.slice(PREFIXO_A1.length), p.id]));

  const categorias = await codigosCategorias();
  const nomes = new Set([...gabarito.keys(), ...manual.keys(), ...noBandeja.keys()]);
  const divergentes = [...nomes].filter((n) => !gabarito.has(n) || !manual.has(n) || !noBandeja.has(n));
  const invalidas = [...gabarito.values(), ...manual.values()].flatMap((s) => [...s]).filter((c) => !categorias.has(c));
  if (divergentes.length || invalidas.length) {
    throw new Error(
      [
        divergentes.length && `Preparações que não aparecem nas três fontes (gabarito, manual, Bandeja): ${divergentes.join(", ")}`,
        invalidas.length && `Categorias inexistentes: ${[...new Set(invalidas)].join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const linhas: string[][] = [];
  const totais: Record<"BANDEJA" | "MANUAL", Acertos[]> = { BANDEJA: [], MANUAL: [] };
  for (const nome of [...gabarito.keys()].sort()) {
    const { alergenos } = await calcularAlergenos(noBandeja.get(nome)!);
    const sinalizados = { BANDEJA: new Set(alergenos.map((a) => a.categoria)), MANUAL: manual.get(nome)! };
    for (const condicao of ["BANDEJA", "MANUAL"] as const) {
      const a = contarAcertos(gabarito.get(nome)!, sinalizados[condicao]);
      totais[condicao].push(a);
      const t = taxas(a);
      linhas.push([condicao, nome, String(a.vp), String(a.fn), String(a.fp), pct(t.t_omissao), pct(t.t_falso_alarme)]);
    }
  }
  const resumo = (["BANDEJA", "MANUAL"] as const).map((condicao) => {
    const a = somarAcertos(totais[condicao]);
    const t = taxas(a);
    linhas.push([condicao, "TOTAL", String(a.vp), String(a.fn), String(a.fp), pct(t.t_omissao), pct(t.t_falso_alarme)]);
    return `${condicao}: VP ${a.vp}, FN ${a.fn}, FP ${a.fp} · T_omissão ${pct(t.t_omissao)}% · T_falso alarme ${pct(t.t_falso_alarme)}%`;
  });
  escreverTabela(new URL("resultados/a1.csv", pasta), ["condicao", "preparacao", "vp", "fn", "fp", "t_omissao_pct", "t_falso_alarme_pct"], linhas);
  return [`A1 (${gabarito.size} preparações) → resultados/a1.csv`, ...resumo].join("\n");
}

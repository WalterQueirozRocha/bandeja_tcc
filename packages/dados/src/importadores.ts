import { existsSync } from "node:fs";
import { faltaMarcadorGluten } from "@bandeja/dominio";
import { prisma } from "./banco";
import { escreverTabela, lerLinhas, lerTabela, numero, planilha } from "./csv";
import { CategoriaCarboidrato, GrupoAlimentar, ListaIG, ModoPreparo, Presenca } from "./generated/prisma/client";
import { categoriaCarboidratoPadrao, lerAlimentosTaco, sugerirFormas } from "./taco";

// Cada importador valida o arquivo inteiro antes de gravar: com qualquer erro, nada é gravado.
function conferir(erros: string[], arquivo: string) {
  if (erros.length) throw new Error(`${arquivo}: ${erros.length} erro(s)\n${erros.join("\n")}`);
}

function emEnum<T extends string>(valores: Record<string, T>, v: string): v is T {
  return (Object.values(valores) as string[]).includes(v);
}

function conferenciaDupla(l: Record<string, string>, erros: string[]) {
  const [a, b] = [l.conferido_por_1, l.conferido_por_2];
  if (!a || !b) erros.push(`linha ${l.linha}: conferência dupla obrigatória (conferido_por_1 e conferido_por_2)`);
  else if (a.toLowerCase() === b.toLowerCase()) erros.push(`linha ${l.linha}: a conferência deve ser feita por outra pessoa`);
}

async function idsPorCodigoTaco() {
  const ingredientes = await prisma.ingrediente.findMany({
    where: { codigo_taco: { not: null } },
    select: { id: true, codigo_taco: true },
  });
  return new Map(ingredientes.map((i) => [i.codigo_taco!, i.id]));
}

export async function importarTaco() {
  const alimentos = lerAlimentosTaco(lerLinhas(planilha("taco.csv")));
  const erros: string[] = [];
  const excecoes = new Map<number, { categoria: CategoriaCarboidrato; rds: number | null }>();
  for (const l of lerTabela(planilha("carboidratos.csv"))) {
    if (!emEnum(CategoriaCarboidrato, l.categoria_carboidrato ?? "")) {
      erros.push(`linha ${l.linha}: categoria_carboidrato inválida "${l.categoria_carboidrato}"`);
      continue;
    }
    excecoes.set(Number(l.codigo_taco), {
      categoria: l.categoria_carboidrato as CategoriaCarboidrato,
      rds: l.rds_percentual ? numero(l.rds_percentual) : null,
    });
  }
  conferir(erros, "carboidratos.csv");

  await prisma.$transaction(
    alimentos.map((a) => {
      const exc = excecoes.get(a.codigo_taco);
      const dados = {
        ...a,
        origem: "TACO" as const,
        categoria_carboidrato: exc?.categoria ?? categoriaCarboidratoPadrao(a),
        rds_percentual: exc?.rds ?? null,
      };
      return prisma.ingrediente.upsert({ where: { codigo_taco: a.codigo_taco }, update: dados, create: dados });
    }),
  );
  return `${alimentos.length} alimentos da TACO (${excecoes.size} exceções de carboidrato)`;
}

const CABECALHO_FORMAS = ["codigo_taco_preparado", "nome_preparado", "modo_preparo", "codigo_taco_cru", "nome_cru"];

// Escreve a sugestão só se a planilha ainda não tiver dados, para não apagar a conferência da equipe.
export function sugerirFormasCsv() {
  const arquivo = planilha("formas-preparadas.csv");
  if (existsSync(arquivo) && lerTabela(arquivo).length > 0) {
    throw new Error("formas-preparadas.csv já tem dados; apague as linhas para gerar uma nova sugestão");
  }
  const formas = sugerirFormas(lerAlimentosTaco(lerLinhas(planilha("taco.csv"))));
  escreverTabela(
    arquivo,
    CABECALHO_FORMAS,
    formas.map((f) => [String(f.preparado.codigo_taco), f.preparado.nome, f.modo, String(f.cru.codigo_taco), f.cru.nome]),
  );
  return `${formas.length} ligações sugeridas em formas-preparadas.csv`;
}

export async function importarFormas() {
  const ids = await idsPorCodigoTaco();
  const erros: string[] = [];
  const ligacoes: { id: number; forma_crua_id: number; modo_preparo: ModoPreparo }[] = [];
  for (const l of lerTabela(planilha("formas-preparadas.csv"))) {
    const id = ids.get(Number(l.codigo_taco_preparado));
    const forma_crua_id = ids.get(Number(l.codigo_taco_cru));
    if (!id || !forma_crua_id) erros.push(`linha ${l.linha}: código TACO não importado`);
    else if (!emEnum(ModoPreparo, l.modo_preparo ?? "") || l.modo_preparo === "CRU") erros.push(`linha ${l.linha}: modo_preparo inválido "${l.modo_preparo}"`);
    else ligacoes.push({ id, forma_crua_id, modo_preparo: l.modo_preparo as ModoPreparo });
  }
  conferir(erros, "formas-preparadas.csv");

  await prisma.$transaction([
    prisma.ingrediente.updateMany({ where: { origem: "TACO" }, data: { forma_crua_id: null, modo_preparo: null } }),
    ...ligacoes.map(({ id, ...dados }) => prisma.ingrediente.update({ where: { id }, data: dados })),
  ]);
  return `${ligacoes.length} formas preparadas ligadas`;
}

export async function importarFatores() {
  const erros: string[] = [];
  const vistos = new Set<string>();
  const fatores = lerTabela(planilha("fatores-coccao.csv")).flatMap((l) => {
    const chave = `${l.grupo_alimentar}/${l.modo_preparo}`;
    if (!emEnum(GrupoAlimentar, l.grupo_alimentar ?? "")) erros.push(`linha ${l.linha}: grupo_alimentar inválido`);
    else if (!emEnum(ModoPreparo, l.modo_preparo ?? "")) erros.push(`linha ${l.linha}: modo_preparo inválido`);
    else if (vistos.has(chave)) erros.push(`linha ${l.linha}: fator repetido para ${chave}`);
    else if (!l.referencia) erros.push(`linha ${l.linha}: referência obrigatória`);
    else {
      vistos.add(chave);
      try {
        return [{
          grupo_alimentar: l.grupo_alimentar as GrupoAlimentar,
          modo_preparo: l.modo_preparo as ModoPreparo,
          fator_coccao: numero(l.fator_coccao ?? ""),
          referencia: l.referencia,
        }];
      } catch (e) {
        erros.push(`linha ${l.linha}: ${(e as Error).message}`);
      }
    }
    return [];
  });
  conferir(erros, "fatores-coccao.csv");

  await prisma.$transaction([prisma.fatorPreparo.deleteMany(), prisma.fatorPreparo.createMany({ data: fatores })]);
  return `${fatores.length} fatores de cocção`;
}

export async function importarMarcadores() {
  const ids = await idsPorCodigoTaco();
  const categorias = new Set((await prisma.categoriaRestricao.findMany({ select: { codigo: true } })).map((c) => c.codigo));
  const erros: string[] = [];
  const porIngrediente = new Map<number, string[]>();
  const marcadores = lerTabela(planilha("marcadores.csv")).flatMap((l) => {
    const ingrediente_id = ids.get(Number(l.codigo_taco));
    const categoria_codigo = l.categoria ?? "";
    conferenciaDupla(l, erros);
    if (!ingrediente_id) erros.push(`linha ${l.linha}: código TACO ${l.codigo_taco} não importado`);
    else if (!categorias.has(categoria_codigo)) erros.push(`linha ${l.linha}: categoria inválida "${categoria_codigo}"`);
    else if (!emEnum(Presenca, l.presenca ?? "")) erros.push(`linha ${l.linha}: presenca inválida "${l.presenca}"`);
    else if (porIngrediente.get(ingrediente_id)?.includes(categoria_codigo)) erros.push(`linha ${l.linha}: categoria repetida no ingrediente`);
    else {
      porIngrediente.set(ingrediente_id, [...(porIngrediente.get(ingrediente_id) ?? []), categoria_codigo]);
      return [{
        ingrediente_id,
        categoria_codigo,
        presenca: l.presenca as Presenca,
        origem: "MAPEAMENTO" as const,
        conferido_por_1: l.conferido_por_1!,
        conferido_por_2: l.conferido_por_2!,
      }];
    }
    return [];
  });
  for (const [id, cats] of porIngrediente) {
    if (faltaMarcadorGluten(cats)) erros.push(`código TACO ${[...ids].find(([, v]) => v === id)?.[0]}: cereal com glúten sem o marcador GLUTEN`);
  }
  conferir(erros, "marcadores.csv");

  await prisma.$transaction([
    prisma.marcadorIngrediente.deleteMany({ where: { origem: "MAPEAMENTO" } }),
    prisma.marcadorIngrediente.createMany({ data: marcadores }),
  ]);
  return `${marcadores.length} marcadores em ${porIngrediente.size} ingredientes`;
}

// IG na escala do pão é convertido para a escala da glicose (÷ 1,4; FAO/OMS, 1998).
export async function importarIg() {
  const ids = await idsPorCodigoTaco();
  const erros: string[] = [];
  const vistos = new Set<number>();
  const valores = lerTabela(planilha("valores-ig.csv")).flatMap((l) => {
    const ingrediente_id = ids.get(Number(l.codigo_taco));
    const escala = l.escala || "GLICOSE";
    conferenciaDupla(l, erros);
    if (!ingrediente_id) erros.push(`linha ${l.linha}: código TACO ${l.codigo_taco} não importado`);
    else if (vistos.has(ingrediente_id)) erros.push(`linha ${l.linha}: ingrediente repetido (um IG por ingrediente)`);
    else if (!emEnum(ListaIG, l.lista ?? "")) erros.push(`linha ${l.linha}: lista inválida "${l.lista}"`);
    else if (escala !== "GLICOSE" && escala !== "PAO") erros.push(`linha ${l.linha}: escala deve ser GLICOSE ou PAO`);
    else if (!l.item_correspondente || !l.justificativa) erros.push(`linha ${l.linha}: item_correspondente e justificativa obrigatórios`);
    else {
      try {
        const ig = numero(l.ig ?? "");
        if (ig <= 0) throw new Error("ig deve ser positivo");
        vistos.add(ingrediente_id);
        return [{
          ingrediente_id,
          ig: escala === "PAO" ? ig / 1.4 : ig,
          item_correspondente: l.item_correspondente,
          lista: l.lista as ListaIG,
          justificativa: l.justificativa,
          conferido_por_1: l.conferido_por_1!,
          conferido_por_2: l.conferido_por_2!,
        }];
      } catch (e) {
        erros.push(`linha ${l.linha}: ${(e as Error).message}`);
      }
    }
    return [];
  });
  conferir(erros, "valores-ig.csv");

  await prisma.$transaction([prisma.valorIG.deleteMany(), prisma.valorIG.createMany({ data: valores })]);
  return `${valores.length} valores de IG`;
}

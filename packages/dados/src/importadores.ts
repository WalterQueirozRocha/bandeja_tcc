import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { faltaMarcadorGluten } from "@bandeja/dominio";
import { prisma } from "./banco";
import { recalcularPesosFinais } from "./pesos";
import { escreverTabela, lerLinhas, lerTabela, numero, planilha } from "./csv";
import { CategoriaCarboidrato, GrupoAlimentar, ListaIG, ModoPreparo, Papel, Presenca } from "./generated/prisma/client";
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
      const dados = { ...a, origem: "TACO" as const };
      // FC-09: alimento já importado mantém a categoria e o RDS editados na tela; só a planilha de exceções os troca.
      return prisma.ingrediente.upsert({
        where: { codigo_taco: a.codigo_taco },
        update: { ...dados, ...(exc && { categoria_carboidrato: exc.categoria, rds_percentual: exc.rds }) },
        create: { ...dados, categoria_carboidrato: exc?.categoria ?? categoriaCarboidratoPadrao(a), rds_percentual: exc?.rds ?? null },
      });
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

  // Mescla: liga as da planilha e mantém as feitas pela API (M3). Para desligar, DELETE .../forma-crua.
  await prisma.$transaction(ligacoes.map(({ id, ...dados }) => prisma.ingrediente.update({ where: { id }, data: dados })));
  return `${ligacoes.length} formas preparadas ligadas`;
}

export async function importarFatores() {
  const erros: string[] = [];
  const vistos = new Set<string>();
  const fatores = lerTabela(planilha("fatores-coccao.csv")).flatMap((l) => {
    const chave = `${l.grupo_alimentar}/${l.modo_preparo}`;
    if (!emEnum(GrupoAlimentar, l.grupo_alimentar ?? "")) erros.push(`linha ${l.linha}: grupo_alimentar inválido`);
    else if (!emEnum(ModoPreparo, l.modo_preparo ?? "") || l.modo_preparo === "CRU") erros.push(`linha ${l.linha}: modo_preparo inválido (CRU usa sempre fator 1)`);
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

  // Mescla por (grupo, modo): mantém os criados pela API (M1).
  const existentes = new Map((await prisma.fatorPreparo.findMany()).map((f) => [`${f.grupo_alimentar}/${f.modo_preparo}`, f.id]));
  await prisma.$transaction(
    fatores.map((f) => {
      const id = existentes.get(`${f.grupo_alimentar}/${f.modo_preparo}`);
      return id ? prisma.fatorPreparo.update({ where: { id }, data: f }) : prisma.fatorPreparo.create({ data: f });
    }),
  );
  const recalculadas = await recalcularPesosFinais();
  return `${fatores.length} fatores de cocção (${recalculadas} preparações com o peso final recalculado)`;
}

export async function importarMarcadores() {
  const ids = await idsPorCodigoTaco();
  const categorias = new Set((await prisma.categoriaRestricao.findMany({ select: { codigo: true } })).map((c) => c.codigo));
  const erros: string[] = [];
  const porIngrediente = new Map<number, string[]>();
  // D6: a conferência vale para o conjunto do alimento; linha sem categoria e sem presença = conferido, sem alergênico.
  const conferencias = new Map<number, { conferido_por_1: string; conferido_por_2: string }>();
  const semAlergenico = new Map<number, string>(); // ingrediente → linha
  const marcadores = lerTabela(planilha("marcadores.csv")).flatMap((l) => {
    const ingrediente_id = ids.get(Number(l.codigo_taco));
    const categoria_codigo = l.categoria ?? "";
    conferenciaDupla(l, erros);
    if (ingrediente_id && l.conferido_por_1 && l.conferido_por_2) {
      const conferencia = { conferido_por_1: l.conferido_por_1, conferido_por_2: l.conferido_por_2 };
      const anterior = conferencias.get(ingrediente_id) ?? conferencia;
      const mesma = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      if (!mesma(anterior.conferido_por_1, conferencia.conferido_por_1) || !mesma(anterior.conferido_por_2, conferencia.conferido_por_2)) {
        erros.push(`linha ${l.linha}: conferentes diferentes das outras linhas do mesmo alimento`);
      }
      conferencias.set(ingrediente_id, anterior);
    }
    if (!ingrediente_id) erros.push(`linha ${l.linha}: código TACO ${l.codigo_taco} não importado`);
    else if (!categoria_codigo && !l.presenca) {
      if (porIngrediente.has(ingrediente_id) || semAlergenico.has(ingrediente_id)) erros.push(`linha ${l.linha}: "sem alergênico" junto com outra linha do mesmo alimento`);
      semAlergenico.set(ingrediente_id, l.linha);
    } else if (semAlergenico.has(ingrediente_id)) erros.push(`linha ${l.linha}: marcador num alimento marcado como "sem alergênico"`);
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
  // S1 sobre a união com os marcadores que o ingrediente já tem (a importação mescla).
  const jaGravados = await prisma.marcadorIngrediente.findMany({
    where: { ingrediente_id: { in: [...porIngrediente.keys(), ...semAlergenico.keys()] } },
    select: { ingrediente_id: true, categoria_codigo: true },
  });
  for (const [id, cats] of porIngrediente) {
    const todas = [...cats, ...jaGravados.filter((m) => m.ingrediente_id === id).map((m) => m.categoria_codigo)];
    if (faltaMarcadorGluten(todas)) erros.push(`código TACO ${[...ids].find(([, v]) => v === id)?.[0]}: cereal com glúten sem o marcador GLUTEN`);
  }
  for (const [id, linha] of semAlergenico) {
    if (jaGravados.some((m) => m.ingrediente_id === id)) erros.push(`linha ${linha}: o alimento já tem marcadores gravados; para tirar, use a tela do ingrediente`);
  }
  conferir(erros, "marcadores.csv");

  // Mescla por (ingrediente, categoria): mantém os editados pela API. Para remover, PUT .../marcadores.
  const agora = new Date();
  await prisma.$transaction([
    ...marcadores.map(({ ingrediente_id, categoria_codigo, ...dados }) =>
      prisma.marcadorIngrediente.upsert({
        where: { ingrediente_id_categoria_codigo: { ingrediente_id, categoria_codigo } },
        update: dados,
        create: { ingrediente_id, categoria_codigo, ...dados },
      }),
    ),
    ...[...conferencias].map(([id, c]) =>
      prisma.ingrediente.update({
        where: { id },
        data: { marcacao_conferida_por_1: c.conferido_por_1, marcacao_conferida_por_2: c.conferido_por_2, marcacao_conferida_em: agora },
      }),
    ),
  ]);
  return `${marcadores.length} marcadores em ${porIngrediente.size} ingredientes; ${conferencias.size} alimentos com a marcação conferida (${semAlergenico.size} sem alergênico)`;
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

  // Mescla por ingrediente: mantém os pareados pela API (M2). Para remover, DELETE .../ig.
  await prisma.$transaction(
    valores.map(({ ingrediente_id, ...dados }) =>
      prisma.valorIG.upsert({ where: { ingrediente_id }, update: dados, create: { ingrediente_id, ...dados } }),
    ),
  );
  return `${valores.length} valores de IG`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 6;

// B1: cria ou atualiza pelo e-mail (mescla). A senha vale só para os usuários novos; o papel não muda.
// Colunas: email; nome; papel; serie (só ALUNO); responsaveis (e-mails separados por "|", só ALUNO).
export async function importarUsuarios(senha?: string, arquivo: string | URL = planilha("usuarios.csv")) {
  const linhas = lerTabela(arquivo).map((l) => ({
    linha: l.linha,
    email: (l.email ?? "").toLowerCase(),
    nome: l.nome ?? "",
    papel: l.papel ?? "",
    serie: l.serie ?? "",
    responsaveis: (l.responsaveis ?? "").split("|").map((e) => e.trim().toLowerCase()).filter(Boolean),
  }));
  const citados = [...new Set([...linhas.map((l) => l.email), ...linhas.flatMap((l) => l.responsaveis)])];
  const noBanco = new Map(
    (await prisma.usuario.findMany({ where: { email: { in: citados } }, select: { email: true, papel: true } })).map((u) => [u.email, u.papel]),
  );
  const papelDe = (email: string) => linhas.find((l) => l.email === email)?.papel ?? noBanco.get(email);

  const erros: string[] = [];
  const vistos = new Set<string>();
  for (const l of linhas) {
    if (!EMAIL.test(l.email)) erros.push(`linha ${l.linha}: e-mail inválido "${l.email}"`);
    else if (vistos.has(l.email)) erros.push(`linha ${l.linha}: e-mail repetido`);
    vistos.add(l.email);
    if (!l.nome) erros.push(`linha ${l.linha}: nome obrigatório`);
    if (!emEnum(Papel, l.papel)) erros.push(`linha ${l.linha}: papel inválido "${l.papel}"`);
    else if (noBanco.has(l.email) && noBanco.get(l.email) !== l.papel) erros.push(`linha ${l.linha}: o papel de um usuário existente não muda`);
    if ((l.papel === "ALUNO") !== Boolean(l.serie)) erros.push(`linha ${l.linha}: série é obrigatória para aluno e só vale para aluno`);
    if (l.responsaveis.length && l.papel !== "ALUNO") erros.push(`linha ${l.linha}: responsáveis só para aluno`);
    for (const r of l.responsaveis.filter((r) => papelDe(r) !== "RESPONSAVEL")) {
      erros.push(`linha ${l.linha}: "${r}" não é um responsável (na planilha ou já cadastrado)`);
    }
  }
  const novos = linhas.filter((l) => !noBanco.has(l.email));
  if (novos.length && (senha ?? "").length < SENHA_MINIMA) {
    erros.push(`informe a senha inicial dos ${novos.length} usuários novos: --senha=... (mínimo ${SENHA_MINIMA} caracteres)`);
  }
  conferir(erros, "usuarios.csv");

  const senha_hash = novos.length ? await bcrypt.hash(senha!, 10) : "";
  await prisma.$transaction(
    async (tx) => {
      const ids = new Map<string, number>();
      for (const l of linhas) {
        const u = await tx.usuario.upsert({
          where: { email: l.email },
          update: { nome: l.nome },
          create: { email: l.email, nome: l.nome, papel: l.papel as Papel, senha_hash },
        });
        ids.set(l.email, u.id);
        if (l.papel === "ALUNO") {
          await tx.aluno.upsert({ where: { usuario_id: u.id }, update: { serie: l.serie }, create: { usuario_id: u.id, serie: l.serie } });
        }
      }
      for (const l of linhas.filter((l) => l.responsaveis.length)) {
        const aluno = await tx.aluno.findUniqueOrThrow({ where: { usuario_id: ids.get(l.email)! } });
        const responsaveis = await tx.usuario.findMany({ where: { email: { in: l.responsaveis } }, select: { id: true } });
        await tx.vinculoResponsavel.createMany({
          data: responsaveis.map((r) => ({ aluno_id: aluno.id, responsavel_id: r.id })),
          skipDuplicates: true,
        });
      }
    },
    { timeout: 60_000 },
  );
  return `${linhas.length} usuários (${novos.length} novos)`;
}

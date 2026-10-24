import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import { prisma } from "./banco";
import type { CategoriaCarboidrato, GrupoAlimentar, Papel, Periodo, TipoRestricao } from "./generated/prisma/client";

// A5 (doc v3 §11): perfis fictícios e cardápio que gera os três resultados no ambiente publicado.
// Uso: npm run db:demo -- --senha=SENHA [--de=AAAA-MM-DD]. Idempotente; não apaga nada.
export const DOMINIO_DEMO = "@demo.bandeja.app";
const SERIE = "8º ano";
const DIAS_UTEIS = 10;

type Pessoa = { email: string; nome: string; papel: Papel };
type Restricao = { categoria_codigo: string; tipo: TipoRestricao; limite_notificacao?: number };
const OPERADOR: Pessoa = { email: `operador${DOMINIO_DEMO}`, nome: "Operador da Cantina", papel: "OPERADOR" };
const FAMILIAS: { aluno: Pessoa; responsavel: Pessoa; restricoes: Restricao[] }[] = [
  {
    aluno: { email: `aluno.alergia${DOMINIO_DEMO}`, nome: "Ana Souza", papel: "ALUNO" },
    responsavel: { email: `responsavel.alergia${DOMINIO_DEMO}`, nome: "Marta Souza", papel: "RESPONSAVEL" },
    restricoes: [{ categoria_codigo: "AMENDOIM", tipo: "ALERGIA" }],
  },
  {
    aluno: { email: `aluno.intolerancia${DOMINIO_DEMO}`, nome: "Bruno Lima", papel: "ALUNO" },
    responsavel: { email: `responsavel.intolerancia${DOMINIO_DEMO}`, nome: "Paulo Lima", papel: "RESPONSAVEL" },
    restricoes: [{ categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA", limite_notificacao: 2 }],
  },
  {
    aluno: { email: `aluno.semrestricao${DOMINIO_DEMO}`, nome: "Carla Dias", papel: "ALUNO" },
    responsavel: { email: `responsavel.semrestricao${DOMINIO_DEMO}`, nome: "Rita Dias", papel: "RESPONSAVEL" },
    restricoes: [],
  },
];

// Industrializados pelo rótulo (por 100 g): o demo não depende das planilhas de marcadores da TACO.
type Rotulo = {
  nome: string;
  grupo_alimentar: GrupoAlimentar;
  categoria_carboidrato: CategoriaCarboidrato;
  nutrientes: [energia_kcal: number, proteina_g: number, lipideos_g: number, carboidrato_g: number, fibra_g: number, cinzas_g: number, umidade_g: number];
  contem: string[];
};
const INGREDIENTES: Rotulo[] = [
  { nome: "Paçoca de amendoim", grupo_alimentar: "PRODUTOS_ACUCARADOS", categoria_carboidrato: "SACAROSE", nutrientes: [487, 16, 26, 52, 4, 2, 1], contem: ["AMENDOIM"] },
  { nome: "Achocolatado em pó", grupo_alimentar: "PRODUTOS_ACUCARADOS", categoria_carboidrato: "SACAROSE", nutrientes: [401, 4.2, 2.2, 91, 3.9, 1.5, 1.5], contem: ["LEITE", "LACTOSE"] },
  { nome: "Leite integral UHT", grupo_alimentar: "LEITE", categoria_carboidrato: "LACTOSE", nutrientes: [60, 3, 3, 4.5, 0, 0.7, 88], contem: ["LEITE", "LACTOSE"] },
  { nome: "Pão de forma", grupo_alimentar: "CEREAIS", categoria_carboidrato: "AMIDO", nutrientes: [253, 9.4, 2.7, 49.9, 2.3, 1.8, 34], contem: ["TRIGO", "GLUTEN"] },
  { nome: "Banana prata", grupo_alimentar: "FRUTAS", categoria_carboidrato: "GLICOSE", nutrientes: [98, 1.3, 0.1, 26, 2, 0.8, 72], contem: [] },
  { nome: "Suco de laranja integral", grupo_alimentar: "BEBIDAS", categoria_carboidrato: "SACAROSE", nutrientes: [33, 0.7, 0.1, 7.6, 0.4, 0.4, 91], contem: [] },
];

// Ana: Paçoca BLOQUEADO · Bruno: Achocolatado ATENÇÃO · Carla e os demais itens: COMPATÍVEL.
const PREPARACOES: { nome: string; preco: number; itens: [ingrediente: string, gramas: number][] }[] = [
  { nome: "Paçoca", preco: 2.5, itens: [["Paçoca de amendoim", 30]] },
  { nome: "Achocolatado com leite", preco: 4, itens: [["Leite integral UHT", 200], ["Achocolatado em pó", 20]] },
  { nome: "Pão com banana", preco: 5, itens: [["Pão de forma", 50], ["Banana prata", 50]] },
  { nome: "Suco de laranja", preco: 4.5, itens: [["Suco de laranja integral", 200]] },
  { nome: "Banana", preco: 2, itens: [["Banana prata", 100]] },
];

const hojeNaBahia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(new Date());

export function diasUteis(de: string, quantidade: number) {
  const dias: string[] = [];
  for (let d = new Date(`${de}T12:00:00Z`); dias.length < quantidade; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

// A senha vale só para quem ainda não existe (como no importador de usuários).
async function garantirUsuario(p: Pessoa, senha_hash: string) {
  return prisma.usuario.upsert({ where: { email: p.email }, update: { nome: p.nome }, create: { ...p, senha_hash }, select: { id: true } });
}

async function garantirIngrediente(r: Rotulo) {
  const [energia_kcal, proteina_g, lipideos_g, carboidrato_g, fibra_g, cinzas_g, umidade_g] = r.nutrientes;
  const dados = { grupo_alimentar: r.grupo_alimentar, categoria_carboidrato: r.categoria_carboidrato, energia_kcal, proteina_g, lipideos_g, carboidrato_g, fibra_g, cinzas_g, umidade_g };
  const existente = await prisma.ingrediente.findFirst({ where: { nome: r.nome, origem: "ROTULO" }, select: { id: true } });
  const { id } = existente
    ? await prisma.ingrediente.update({ where: { id: existente.id }, data: dados, select: { id: true } })
    : await prisma.ingrediente.create({ data: { nome: r.nome, origem: "ROTULO", ...dados }, select: { id: true } });
  for (const categoria_codigo of r.contem) {
    await prisma.marcadorIngrediente.upsert({
      where: { ingrediente_id_categoria_codigo: { ingrediente_id: id, categoria_codigo } },
      update: { presenca: "CONTEM", origem: "ROTULO" },
      create: { ingrediente_id: id, categoria_codigo, presenca: "CONTEM", origem: "ROTULO" },
    });
  }
  return id;
}

// Preparação já existente fica como está (o operador pode tê-la editado).
async function garantirPreparacao(p: (typeof PREPARACOES)[number], ingredientes: Map<string, number>) {
  const existente = await prisma.preparacao.findFirst({ where: { nome: p.nome, ativo: true }, select: { id: true } });
  if (existente) return existente.id;
  const peso = p.itens.reduce((s, [, g]) => s + g, 0); // modo CRU: fator 1
  const { id } = await prisma.preparacao.create({
    data: {
      nome: p.nome,
      porcao_g: peso,
      peso_final_calculado: peso,
      itens: { create: p.itens.map(([nome, quantidade_crua_g]) => ({ ingrediente_id: ingredientes.get(nome)!, quantidade_crua_g, modo_preparo: "CRU" })) },
    },
    select: { id: true },
  });
  return id;
}

export async function semearDemo(senha: string | undefined, de = hojeNaBahia()) {
  if (!senha || senha.length < 6) throw new Error("Informe --senha=... com pelo menos 6 caracteres");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de)) throw new Error("--de deve estar no formato AAAA-MM-DD");
  const categorias = new Set(INGREDIENTES.flatMap((i) => i.contem).concat(FAMILIAS.flatMap((f) => f.restricoes.map((r) => r.categoria_codigo))));
  if ((await prisma.categoriaRestricao.count({ where: { codigo: { in: [...categorias] } } })) !== categorias.size) {
    throw new Error("Categorias ausentes: rode `npm run db:seed` antes");
  }
  const senha_hash = await bcrypt.hash(senha, 10);

  await garantirUsuario(OPERADOR, senha_hash);
  for (const f of FAMILIAS) {
    const aluno = await garantirUsuario(f.aluno, senha_hash);
    const responsavel = await garantirUsuario(f.responsavel, senha_hash);
    const { id: aluno_id } = await prisma.aluno.upsert({ where: { usuario_id: aluno.id }, update: {}, create: { usuario_id: aluno.id, serie: SERIE }, select: { id: true } });
    await prisma.vinculoResponsavel.upsert({
      where: { aluno_id_responsavel_id: { aluno_id, responsavel_id: responsavel.id } },
      update: {},
      create: { aluno_id, responsavel_id: responsavel.id },
    });
    if (!f.restricoes.length) continue;
    // Perfil de saúde declarado pelo responsável, com consentimento (RNF07).
    await prisma.$transaction([
      prisma.restricaoDeclarada.deleteMany({ where: { aluno_id } }),
      prisma.aluno.update({
        where: { id: aluno_id },
        data: {
          consentimento_por: responsavel.id,
          consentimento_em: new Date(),
          restricoes: { create: f.restricoes.map((r) => ({ ...r, declarada_por: responsavel.id })) },
        },
      }),
    ]);
  }

  const ingredientes = new Map<string, number>();
  for (const r of INGREDIENTES) ingredientes.set(r.nome, await garantirIngrediente(r));
  const preparacoes = await Promise.all(PREPARACOES.map(async (p) => ({ id: await garantirPreparacao(p, ingredientes), preco: p.preco })));

  let criados = 0;
  for (const dia of diasUteis(de, DIAS_UTEIS)) {
    for (const periodo of ["MANHA", "TARDE"] satisfies Periodo[]) {
      const data = new Date(`${dia}T00:00:00Z`);
      if (await prisma.cardapio.count({ where: { data, periodo, ativo: true } })) continue;
      await prisma.cardapio.create({ data: { data, periodo, itens: { create: preparacoes.map((p) => ({ preparacao_id: p.id, preco: p.preco })) } } });
      criados++;
    }
  }
  return `Demo: 1 operador, ${FAMILIAS.length} alunos e ${FAMILIAS.length} responsáveis (${DOMINIO_DEMO}), ${PREPARACOES.length} preparações e ${criados} cardápios novos a partir de ${de}.`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const arg = (nome: string) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3);
  semearDemo(arg("senha"), arg("de"))
    .then(console.log)
    .catch((e: Error) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

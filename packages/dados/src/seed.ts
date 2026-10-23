import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import { prisma } from "./banco";
import type { GrupoSintoma, Papel, TipoCategoria } from "./generated/prisma/client";

const RDC = "RDC nº 727/2022";

// 27 categorias (doc §4.1): 21 alergênicos, lactose, glúten e 4 de origem animal.
export const CATEGORIAS: [codigo: string, nome: string, tipo: TipoCategoria, fonte: string][] = [
  ["TRIGO", "Trigo", "ALERGENICO", RDC],
  ["CENTEIO", "Centeio", "ALERGENICO", RDC],
  ["CEVADA", "Cevada", "ALERGENICO", RDC],
  ["AVEIA", "Aveia", "ALERGENICO", RDC],
  ["CRUSTACEOS", "Crustáceos", "ALERGENICO", RDC],
  ["OVOS", "Ovos", "ALERGENICO", RDC],
  ["PEIXES", "Peixes", "ALERGENICO", RDC],
  ["AMENDOIM", "Amendoim", "ALERGENICO", RDC],
  ["SOJA", "Soja", "ALERGENICO", RDC],
  ["LEITE", "Leite de mamíferos", "ALERGENICO", RDC],
  ["AMENDOA", "Amêndoa", "ALERGENICO", RDC],
  ["AVELA", "Avelã", "ALERGENICO", RDC],
  ["CASTANHA_CAJU", "Castanha-de-caju", "ALERGENICO", RDC],
  ["CASTANHA_PARA", "Castanha-do-pará", "ALERGENICO", RDC],
  ["MACADAMIA", "Macadâmia", "ALERGENICO", RDC],
  ["NOZES", "Nozes", "ALERGENICO", RDC],
  ["PECA", "Pecã", "ALERGENICO", RDC],
  ["PISTACHE", "Pistache", "ALERGENICO", RDC],
  ["PINOLI", "Pinoli", "ALERGENICO", RDC],
  ["CASTANHAS", "Castanhas", "ALERGENICO", RDC],
  ["LATEX", "Látex natural", "ALERGENICO", RDC],
  ["LACTOSE", "Lactose", "LACTOSE", RDC],
  ["GLUTEN", "Glúten", "GLUTEN", "Lei nº 10.674/2003"],
  ["BOVINA", "Origem bovina", "ORIGEM_ANIMAL", "Decisão da equipe"],
  ["SUINA", "Origem suína", "ORIGEM_ANIMAL", "Decisão da equipe"],
  ["AVES", "Origem aves", "ORIGEM_ANIMAL", "Decisão da equipe"],
  ["PESCADOS", "Origem pescados", "ORIGEM_ANIMAL", "Decisão da equipe"],
];

// Lista fixa do Quadro 8.
export const SINTOMAS: [codigo: string, descricao: string, grupo: GrupoSintoma][] = [
  ["COCEIRA_PELE", "Coceira", "PELE"],
  ["MANCHAS_VERMELHAS", "Manchas ou placas vermelhas", "PELE"],
  ["INCHACO_ROSTO", "Inchaço nos lábios, nos olhos ou no rosto", "PELE"],
  ["COCEIRA_BOCA", "Coceira ou formigamento na boca", "BOCA_GARGANTA"],
  ["APERTO_GARGANTA", "Sensação de aperto na garganta", "BOCA_GARGANTA"],
  ["ENJOO", "Enjoo", "BARRIGA"],
  ["VOMITO", "Vômito", "BARRIGA"],
  ["DOR_COLICA", "Dor ou cólica", "BARRIGA"],
  ["BARRIGA_ESTUFADA", "Barriga estufada ou gases", "BARRIGA"],
  ["DIARREIA", "Diarreia", "BARRIGA"],
  ["ESPIRROS", "Espirros ou nariz escorrendo", "RESPIRACAO"],
  ["TOSSE_CHIADO", "Tosse ou chiado no peito", "RESPIRACAO"],
  ["FALTA_AR", "Falta de ar", "RESPIRACAO"],
  ["TONTURA_FRAQUEZA", "Tontura ou fraqueza", "OUTROS"],
  ["OUTRO", "Outro", "OUTROS"],
];

// Usuários fictícios só para desenvolvimento e testes (nunca em produção).
export const SENHA_TESTE = "bandeja-teste";
export const USUARIOS_TESTE: [email: string, nome: string, papel: Papel][] = [
  ["operador@bandeja.test", "Operador Teste", "OPERADOR"],
  ["aluno@bandeja.test", "Aluno Teste", "ALUNO"],
  ["responsavel@bandeja.test", "Responsável Teste", "RESPONSAVEL"],
  ["coordenacao@bandeja.test", "Coordenação Teste", "COORDENACAO"],
];

export async function semear() {
  for (const [codigo, nome, tipo, fonte_regulatoria] of CATEGORIAS) {
    await prisma.categoriaRestricao.upsert({
      where: { codigo },
      update: { nome, tipo, fonte_regulatoria },
      create: { codigo, nome, tipo, fonte_regulatoria },
    });
  }
  for (const [codigo, descricao, grupo] of SINTOMAS) {
    await prisma.sintoma.upsert({
      where: { codigo },
      update: { descricao, grupo },
      create: { codigo, descricao, grupo },
    });
  }

  if (process.env.NODE_ENV === "production") return;
  const senha_hash = await bcrypt.hash(SENHA_TESTE, 10);
  const ids: Partial<Record<Papel, number>> = {};
  for (const [email, nome, papel] of USUARIOS_TESTE) {
    const u = await prisma.usuario.upsert({
      where: { email },
      update: { nome, papel, senha_hash },
      create: { email, nome, papel, senha_hash },
    });
    ids[papel] = u.id;
  }
  const aluno = await prisma.aluno.upsert({
    where: { usuario_id: ids.ALUNO! },
    update: {},
    create: { usuario_id: ids.ALUNO!, serie: "9º ano" },
  });
  await prisma.vinculoResponsavel.upsert({
    where: { aluno_id_responsavel_id: { aluno_id: aluno.id, responsavel_id: ids.RESPONSAVEL! } },
    update: {},
    create: { aluno_id: aluno.id, responsavel_id: ids.RESPONSAVEL! },
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  semear()
    .then(() => console.log(`Seed: ${CATEGORIAS.length} categorias, ${SINTOMAS.length} sintomas, ${USUARIOS_TESTE.length} usuários de teste.`))
    .finally(() => prisma.$disconnect());
}

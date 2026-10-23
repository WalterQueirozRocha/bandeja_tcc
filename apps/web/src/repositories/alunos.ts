import { prisma, type TipoRestricao } from "@bandeja/dados";

export type NovaRestricao = { categoria_codigo: string; tipo: TipoRestricao; limite_notificacao: number };

// Para o operador identificar o aluno no balcão: só nome e série, nada de saúde.
export async function buscarAlunos(busca?: string) {
  const alunos = await prisma.aluno.findMany({
    where: busca ? { usuario: { nome: { contains: busca, mode: "insensitive" } } } : undefined,
    select: { id: true, serie: true, usuario: { select: { nome: true } } },
    orderBy: { id: "asc" },
    take: 50,
  });
  return alunos.map((a) => ({ id: a.id, serie: a.serie, nome: a.usuario?.nome ?? `Aluno ${a.id}` }));
}

export function buscarAlunoDoUsuario(usuario_id: number) {
  return prisma.aluno.findUnique({ where: { usuario_id }, select: { id: true } });
}

export async function alunosDoResponsavel(responsavel_id: number) {
  const vinculos = await prisma.vinculoResponsavel.findMany({
    where: { responsavel_id },
    select: { aluno: { select: { id: true, serie: true, usuario: { select: { nome: true } } } } },
    orderBy: { aluno_id: "asc" },
  });
  return vinculos.map(({ aluno }) => ({ id: aluno.id, serie: aluno.serie, nome: aluno.usuario?.nome ?? `Aluno ${aluno.id}` }));
}

export async function estaVinculado(aluno_id: number, responsavel_id: number) {
  return (await prisma.vinculoResponsavel.count({ where: { aluno_id, responsavel_id } })) > 0;
}

export function buscarPerfil(aluno_id: number) {
  return prisma.aluno.findUnique({
    where: { id: aluno_id },
    select: {
      id: true,
      consentimento_por: true,
      consentimento_em: true,
      restricoes: {
        select: { categoria_codigo: true, tipo: true, limite_notificacao: true, data: true, categoria: { select: { nome: true } } },
        orderBy: { categoria_codigo: "asc" },
      },
    },
  });
}

// Substitui as restrições; registra o consentimento só na primeira vez.
export async function salvarPerfil(aluno_id: number, responsavel_id: number, consentirAgora: boolean, restricoes: NovaRestricao[]) {
  await prisma.$transaction([
    ...(consentirAgora
      ? [prisma.aluno.update({ where: { id: aluno_id }, data: { consentimento_por: responsavel_id, consentimento_em: new Date() } })]
      : []),
    prisma.restricaoDeclarada.deleteMany({ where: { aluno_id } }),
    prisma.restricaoDeclarada.createMany({ data: restricoes.map((r) => ({ ...r, aluno_id, declarada_por: responsavel_id })) }),
  ]);
}

// LGPD: revogar o consentimento apaga o perfil de saúde.
export async function apagarPerfil(aluno_id: number) {
  await prisma.$transaction([
    prisma.restricaoDeclarada.deleteMany({ where: { aluno_id } }),
    prisma.aluno.update({ where: { id: aluno_id }, data: { consentimento_por: null, consentimento_em: null } }),
  ]);
}

// O que o domínio precisa para `avaliar`: restrições e bloqueios já executados pelo operador.
export async function perfilCompatibilidade(aluno_id: number) {
  const [restricoes, bloqueios] = await Promise.all([
    prisma.restricaoDeclarada.findMany({ where: { aluno_id }, select: { categoria_codigo: true, tipo: true } }),
    prisma.solicitacaoBloqueio.findMany({ where: { aluno_id, situacao: "EXECUTADA" }, select: { preparacao_id: true } }),
  ]);
  return {
    restricoes: restricoes.map((r) => ({ categoria: r.categoria_codigo, tipo: r.tipo })),
    bloqueios: bloqueios.map((b) => b.preparacao_id),
  };
}

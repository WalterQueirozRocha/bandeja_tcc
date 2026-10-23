import { prisma, type SituacaoBloqueio } from "@bandeja/dados";

const selecao = {
  id: true,
  situacao: true,
  data: true,
  responsavel_id: true,
  aluno: { select: { id: true, usuario: { select: { nome: true } } } },
  preparacao: { select: { id: true, nome: true } },
} as const;

export async function listarBloqueios(filtro: { responsavel_id?: number; situacao?: SituacaoBloqueio }) {
  const lista = await prisma.solicitacaoBloqueio.findMany({ where: filtro, select: selecao, orderBy: { data: "desc" } });
  return lista.map((b) => ({
    id: b.id,
    situacao: b.situacao,
    data: b.data,
    responsavel_id: b.responsavel_id,
    aluno: { id: b.aluno.id, nome: b.aluno.usuario?.nome ?? `Aluno ${b.aluno.id}` },
    preparacao: b.preparacao,
  }));
}

export function buscarBloqueio(id: number) {
  return prisma.solicitacaoBloqueio.findUnique({ where: { id }, select: { id: true, situacao: true, responsavel_id: true } });
}

export async function existeBloqueioAtivo(aluno_id: number, preparacao_id: number) {
  return (await prisma.solicitacaoBloqueio.count({ where: { aluno_id, preparacao_id, situacao: { in: ["SOLICITADA", "EXECUTADA"] } } })) > 0;
}

export function criarBloqueio(responsavel_id: number, aluno_id: number, preparacao_id: number) {
  return prisma.solicitacaoBloqueio.create({ data: { responsavel_id, aluno_id, preparacao_id }, select: { id: true, situacao: true } });
}

export function mudarSituacao(id: number, situacao: SituacaoBloqueio) {
  return prisma.solicitacaoBloqueio.update({ where: { id }, data: { situacao }, select: { id: true, situacao: true } });
}

export function apagarBloqueio(id: number) {
  return prisma.solicitacaoBloqueio.delete({ where: { id } });
}

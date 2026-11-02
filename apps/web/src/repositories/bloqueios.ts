import { prisma, type Prisma, type SituacaoBloqueio } from "@bandeja/dados";
import type { Db } from "./notificacoes";

const selecao = {
  id: true,
  situacao: true,
  data: true,
  responsavel_id: true,
  aluno: { select: { id: true, usuario: { select: { nome: true } } } },
  preparacao: { select: { id: true, nome: true } },
} satisfies Prisma.SolicitacaoBloqueioSelect;

const paraBloqueio = (b: Prisma.SolicitacaoBloqueioGetPayload<{ select: typeof selecao }>) => ({
  id: b.id,
  situacao: b.situacao,
  data: b.data,
  responsavel_id: b.responsavel_id,
  aluno: { id: b.aluno.id, nome: b.aluno.usuario?.nome ?? `Aluno ${b.aluno.id}` },
  preparacao: b.preparacao,
});

export async function listarBloqueios(filtro: { responsavel_id?: number; situacao?: SituacaoBloqueio }) {
  const lista = await prisma.solicitacaoBloqueio.findMany({ where: filtro, select: selecao, orderBy: { data: "desc" } });
  return lista.map(paraBloqueio);
}

export async function buscarBloqueio(id: number) {
  const b = await prisma.solicitacaoBloqueio.findUnique({ where: { id }, select: selecao });
  return b && paraBloqueio(b);
}

export async function existeBloqueioAtivo(aluno_id: number, preparacao_id: number) {
  return (await prisma.solicitacaoBloqueio.count({ where: { aluno_id, preparacao_id, situacao: { in: ["SOLICITADA", "EXECUTADA"] } } })) > 0;
}

export async function criarBloqueio(db: Db, responsavel_id: number, aluno_id: number, preparacao_id: number) {
  return paraBloqueio(await db.solicitacaoBloqueio.create({ data: { responsavel_id, aluno_id, preparacao_id }, select: selecao }));
}

export function mudarSituacao(db: Db, id: number, situacao: SituacaoBloqueio) {
  return db.solicitacaoBloqueio.update({ where: { id }, data: { situacao }, select: { id: true, situacao: true } });
}

export function apagarBloqueio(db: Db, id: number) {
  return db.solicitacaoBloqueio.delete({ where: { id } });
}

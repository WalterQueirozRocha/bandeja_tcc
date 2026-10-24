import { prisma, type SituacaoRegistros } from "@bandeja/dados";

// RF20: pedidos dos registros de sintomas. Nada aqui lê os registros em si.
const nomeDoAluno = (a: { id: number; usuario: { nome: string } | null }) => a.usuario?.nome ?? `Aluno ${a.id}`;

export async function listarPedidos(filtro: { responsavel_id?: number; situacao?: SituacaoRegistros }) {
  const lista = await prisma.solicitacaoRegistros.findMany({
    where: filtro,
    orderBy: { solicitada_em: "desc" },
    select: {
      id: true,
      situacao: true,
      solicitada_em: true,
      decidida_em: true,
      responsavel: { select: { id: true, nome: true, email: true } },
      aluno: { select: { id: true, serie: true, usuario: { select: { nome: true } }, responsaveis: { select: { responsavel_id: true } } } },
    },
  });
  return lista.map((p) => ({
    id: p.id,
    situacao: p.situacao,
    solicitada_em: p.solicitada_em,
    decidida_em: p.decidida_em,
    responsavel: p.responsavel,
    aluno: { id: p.aluno.id, nome: nomeDoAluno(p.aluno), serie: p.aluno.serie },
    // A coordenação confere se quem pediu continua vinculado ao aluno.
    vinculado: p.aluno.responsaveis.some((v) => v.responsavel_id === p.responsavel.id),
  }));
}

export async function buscarPedido(id: number) {
  const p = await prisma.solicitacaoRegistros.findUnique({
    where: { id },
    select: {
      id: true,
      situacao: true,
      responsavel_id: true,
      decidida_em: true,
      aluno: { select: { id: true, serie: true, usuario: { select: { nome: true } } } },
    },
  });
  return p && { ...p, aluno: { id: p.aluno.id, nome: nomeDoAluno(p.aluno), serie: p.aluno.serie } };
}

export async function existePedidoPendente(responsavel_id: number, aluno_id: number) {
  return (await prisma.solicitacaoRegistros.count({ where: { responsavel_id, aluno_id, situacao: "SOLICITADA" } })) > 0;
}

export function criarPedido(responsavel_id: number, aluno_id: number) {
  return prisma.solicitacaoRegistros.create({ data: { responsavel_id, aluno_id }, select: { id: true, situacao: true } });
}

// Só decide o que ainda está SOLICITADA (duas decisões simultâneas não se sobrepõem).
export async function gravarDecisao(id: number, situacao: SituacaoRegistros, decidida_por: number) {
  const { count } = await prisma.solicitacaoRegistros.updateMany({
    where: { id, situacao: "SOLICITADA" },
    data: { situacao, decidida_por, decidida_em: new Date() },
  });
  return count > 0;
}

import { prisma, type SituacaoRegistros, type TipoAcessoRegistros } from "@bandeja/dados";
import type { Db } from "./notificacoes";

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
      acessos: { orderBy: { acessado_em: "desc" }, take: 1, select: { acessado_em: true } },
    },
  });
  return lista.map((p) => ({
    id: p.id,
    situacao: p.situacao,
    solicitada_em: p.solicitada_em,
    decidida_em: p.decidida_em,
    // D4: só a data do último acesso, sem nada do conteúdo.
    ultimo_acesso: p.acessos[0]?.acessado_em ?? null,
    responsavel: p.responsavel,
    aluno: { id: p.aluno.id, nome: nomeDoAluno(p.aluno), serie: p.aluno.serie },
    // A coordenação confere se quem pediu continua vinculado ao aluno.
    vinculado: p.aluno.responsaveis.some((v) => v.responsavel_id === p.responsavel.id),
  }));
}

// D4: cada acesso do responsável aos registros liberados.
export function gravarAcesso(solicitacao_id: number, tipo: TipoAcessoRegistros) {
  return prisma.acessoRegistros.create({ data: { solicitacao_id, tipo } });
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

export async function criarPedido(db: Db, responsavel_id: number, aluno_id: number) {
  const p = await db.solicitacaoRegistros.create({
    data: { responsavel_id, aluno_id },
    select: { id: true, situacao: true, responsavel: { select: { nome: true } }, aluno: { select: { id: true, usuario: { select: { nome: true } } } } },
  });
  return { id: p.id, situacao: p.situacao, responsavel: p.responsavel.nome, aluno: nomeDoAluno(p.aluno) };
}

// Só decide o que ainda está SOLICITADA (duas decisões simultâneas não se sobrepõem).
export async function gravarDecisao(db: Db, id: number, situacao: SituacaoRegistros, decidida_por: number) {
  const { count } = await db.solicitacaoRegistros.updateMany({
    where: { id, situacao: "SOLICITADA" },
    data: { situacao, decidida_por, decidida_em: new Date() },
  });
  return count > 0;
}

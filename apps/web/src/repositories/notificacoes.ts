import { prisma, type Papel, type Prisma } from "@bandeja/dados";

export type Db = Prisma.TransactionClient | typeof prisma;
export type NovaNotificacao = Prisma.NotificacaoUncheckedCreateInput;

// O evento e as notificações que ele gera ficam na mesma transação (D2).
export const emTransacao = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(fn);

export function criarNotificacoes(db: Db, notificacoes: NovaNotificacao[]) {
  return db.notificacao.createMany({ data: notificacoes });
}

export async function idsAtivosDoPapel(db: Db, papel: Papel) {
  return (await db.usuario.findMany({ where: { papel, ativo: true }, select: { id: true } })).map((u) => u.id);
}

export function listarNotificacoes(destinatario_id: number) {
  return prisma.notificacao.findMany({
    where: { destinatario_id },
    orderBy: { criada_em: "desc" },
    take: 100,
    select: { id: true, tipo: true, mensagem: true, link: true, criada_em: true, lida_em: true },
  });
}

export function contarNaoLidas(destinatario_id: number) {
  return prisma.notificacao.count({ where: { destinatario_id, lida_em: null } });
}

// Sem `id`, marca todas. Sempre restrito ao destinatário da sessão.
export async function marcarLidas(destinatario_id: number, id?: number) {
  return (await prisma.notificacao.updateMany({ where: { destinatario_id, id, lida_em: null }, data: { lida_em: new Date() } })).count;
}

import { prisma, type Papel } from "@bandeja/dados";

export function buscarUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
}

export function buscarUsuario(id: number) {
  return prisma.usuario.findUnique({ where: { id }, select: { id: true, nome: true, email: true, papel: true } });
}

export async function usuarioAtivo(id: number) {
  return (await prisma.usuario.findUnique({ where: { id }, select: { ativo: true } }))?.ativo === true;
}

// Nunca devolve o hash da senha.
const selecaoUsuario = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  aluno: { select: { id: true, serie: true } },
} as const;

export function listarUsuarios(filtro: { busca?: string; papel?: Papel; inativos?: boolean }) {
  return prisma.usuario.findMany({
    where: {
      papel: filtro.papel,
      ativo: filtro.inativos ? undefined : true,
      ...(filtro.busca && {
        OR: [{ nome: { contains: filtro.busca, mode: "insensitive" } }, { email: { contains: filtro.busca, mode: "insensitive" } }],
      }),
    },
    orderBy: { nome: "asc" },
    take: 200,
    select: selecaoUsuario,
  });
}

export function detalharUsuario(id: number) {
  return prisma.usuario.findUnique({
    where: { id },
    select: {
      ...selecaoUsuario,
      aluno: { select: { id: true, serie: true, responsaveis: { select: { responsavel: { select: { id: true, nome: true, email: true } } } } } },
      vinculos: { select: { aluno: { select: { id: true, serie: true, usuario: { select: { nome: true } } } } } },
    },
  });
}

export function criarUsuario(dados: { nome: string; email: string; papel: Papel; senha_hash: string; serie?: string }) {
  const { serie, ...usuario } = dados;
  return prisma.usuario.create({
    data: { ...usuario, ...(serie !== undefined && { aluno: { create: { serie } } }) },
    select: selecaoUsuario,
  });
}

export function atualizarUsuario(id: number, dados: { nome: string; email: string; senha_hash?: string; serie?: string }) {
  const { serie, ...usuario } = dados;
  return prisma.usuario.update({
    where: { id },
    data: { ...usuario, ...(serie !== undefined && { aluno: { update: { serie } } }) },
    select: selecaoUsuario,
  });
}

// Em uso = qualquer registro ligado ao usuário ou ao aluno dele.
export async function usuarioEmUso(id: number) {
  const u = await prisma.usuario.findUniqueOrThrow({
    where: { id },
    select: {
      _count: {
        select: { vinculos: true, consentimentos: true, restricoes_declaradas: true, bloqueios_solicitados: true, vendas_registradas: true, notificacoes: true },
      },
      aluno: {
        select: { _count: { select: { responsaveis: true, restricoes: true, bloqueios: true, vendas: true, notificacoes: true, sintomas: true } } },
      },
    },
  });
  const total = (contagens: Record<string, number>) => Object.values(contagens).reduce((s, n) => s + n, 0);
  return total(u._count) + (u.aluno ? total(u.aluno._count) : 0) > 0;
}

export async function apagarUsuario(id: number) {
  await prisma.$transaction([prisma.aluno.deleteMany({ where: { usuario_id: id } }), prisma.usuario.delete({ where: { id } })]);
}

export function mudarAtivoUsuario(id: number, ativo: boolean) {
  return prisma.usuario.update({ where: { id }, data: { ativo }, select: { id: true, ativo: true } });
}

export function buscarAluno(id: number) {
  return prisma.aluno.findUnique({ where: { id }, select: { id: true } });
}

export function criarVinculo(aluno_id: number, responsavel_id: number) {
  return prisma.vinculoResponsavel.create({ data: { aluno_id, responsavel_id } });
}

export function apagarVinculo(aluno_id: number, responsavel_id: number) {
  return prisma.vinculoResponsavel.deleteMany({ where: { aluno_id, responsavel_id } });
}

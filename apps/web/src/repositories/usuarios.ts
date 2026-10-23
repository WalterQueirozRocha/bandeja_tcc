import { prisma } from "@bandeja/dados";

export function buscarUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
}

export function buscarUsuario(id: number) {
  return prisma.usuario.findUnique({ where: { id }, select: { id: true, nome: true, email: true, papel: true } });
}

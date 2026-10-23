import { prisma } from "@bandeja/dados";

export function listarSintomas() {
  return prisma.sintoma.findMany({ select: { codigo: true, descricao: true, grupo: true } });
}

export function buscarSintoma(codigo: string) {
  return prisma.sintoma.findUnique({ where: { codigo }, select: { codigo: true } });
}

export function registrosDoAluno(aluno_id: number) {
  return prisma.registroSintoma.findMany({
    where: { aluno_id },
    orderBy: { data_hora: "desc" },
    take: 200,
    select: { id: true, data_hora: true, observacao: true, sintoma: { select: { codigo: true, descricao: true, grupo: true } } },
  });
}

export function gravarRegistro(aluno_id: number, sintoma_codigo: string, data_hora: Date, observacao: string | null) {
  return prisma.registroSintoma.create({
    data: { aluno_id, sintoma_codigo, data_hora, observacao },
    select: { id: true, data_hora: true, observacao: true, sintoma_codigo: true },
  });
}

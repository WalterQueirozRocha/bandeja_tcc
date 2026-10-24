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

// RF20: o que um pedido autorizado libera — os registros gravados até a decisão da escola.
export function registrosGravadosAte(aluno_id: number, ate: Date) {
  return prisma.registroSintoma.findMany({
    where: { aluno_id, registrado_em: { lte: ate } },
    orderBy: { data_hora: "desc" },
    select: { id: true, data_hora: true, observacao: true, sintoma: { select: { descricao: true } } },
  });
}

export function gravarRegistro(aluno_id: number, sintoma_codigo: string, data_hora: Date, observacao: string | null) {
  return prisma.registroSintoma.create({
    // Mesmo relógio de `decidida_em` (RF20), para a comparação não depender do relógio do banco.
    data: { aluno_id, sintoma_codigo, data_hora, observacao, registrado_em: new Date() },
    select: { id: true, data_hora: true, observacao: true, sintoma_codigo: true },
  });
}

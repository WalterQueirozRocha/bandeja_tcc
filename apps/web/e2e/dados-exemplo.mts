import bcrypt from "bcryptjs";
import { prisma } from "@bandeja/dados";

// Dados de exemplo dos testes de interface, no banco usado pelo servidor de desenvolvimento.
const PREFIXO_E2E = "E2E ";
const DATA_E2E = "2098-12-31";
// Os testes das telas de cadastro criam usuários neste domínio.
const DOMINIO_E2E = "@e2e.teste";

// Remove os dados de exemplo e devolve o aluno de teste sem perfil de saúde.
async function limpar() {
  // Todo cardápio com preparação de exemplo, em qualquer data (as telas de cadastro também publicam).
  const comExemplo = { itens: { some: { preparacao: { nome: { startsWith: PREFIXO_E2E } } } } };
  await prisma.venda.deleteMany({ where: { itens: { some: { item_cardapio: { cardapio: comExemplo } } } } });
  await prisma.cardapio.deleteMany({ where: comExemplo });
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO_E2E } } });
  await prisma.ingrediente.deleteMany({ where: { nome: { startsWith: PREFIXO_E2E }, origem: "ROTULO" } });
  const aluno = await prisma.usuario.findUnique({ where: { email: "aluno@gmail.com" }, include: { aluno: true } });
  // Pedidos de registros (RF20) prendem os usuários que pediram e decidiram.
  if (aluno?.aluno) await prisma.solicitacaoRegistros.deleteMany({ where: { aluno_id: aluno.aluno.id } });
  const usuarios = (await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO_E2E } }, select: { id: true } })).map((u) => u.id);
  // D2: as notificações prendem os destinatários; as geradas pelos exemplos também saem.
  await prisma.notificacao.deleteMany({
    where: {
      OR: [
        { destinatario_id: { in: usuarios } },
        { mensagem: { contains: PREFIXO_E2E } },
        ...["desktop", "celular"].map((p) => ({ mensagem: { contains: `Responsável ${p}` } })),
      ],
    },
  });
  await prisma.aluno.deleteMany({ where: { usuario_id: { in: usuarios } } });
  await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
  if (aluno?.aluno) {
    await prisma.registroSintoma.deleteMany({ where: { aluno_id: aluno.aluno.id } });
    await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: aluno.aluno.id } });
    await prisma.aluno.update({ where: { id: aluno.aluno.id }, data: { consentimento_por: null, consentimento_em: null } });
  }
}

// O Playwright usa a função devolvida como limpeza ao final.
export default async function criarDadosExemplo() {
  await limpar();
  const arroz = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } });
  // D6: a ficha técnica recusa alimento da TACO sem conferência; a tela de cadastro usa um ingrediente de rótulo.
  await prisma.ingrediente.create({
    data: { nome: `${PREFIXO_E2E}Polvilho de rótulo`, origem: "ROTULO", grupo_alimentar: "CEREAIS", categoria_carboidrato: "AMIDO", carboidrato_g: 85 },
  });
  const preparacao = (nome: string, cozinha: string[]) =>
    prisma.preparacao.create({
      data: {
        nome: PREFIXO_E2E + nome,
        porcao_g: 100,
        peso_final_calculado: 100,
        itens: { create: [{ ingrediente_id: arroz.id, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
        marcadores_cozinha: { create: cozinha.map((categoria_codigo) => ({ categoria_codigo, presenca: "PODE_CONTER" as const, motivo: "e2e" })) },
      },
    });
  const [bloqueado, atencao, compativel] = [
    await preparacao("Paçoca", ["AMENDOIM"]),
    await preparacao("Mingau", ["LACTOSE"]),
    await preparacao("Arroz", []),
  ];
  await prisma.cardapio.create({
    data: {
      data: new Date(`${DATA_E2E}T00:00:00Z`),
      periodo: "MANHA",
      itens: { create: [bloqueado, atencao, compativel].map((p) => ({ preparacao_id: p.id, preco: 5 })) },
    },
  });
  const aluno = await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } });
  const responsavel = await prisma.usuario.findUniqueOrThrow({ where: { email: "responsavel@gmail.com" } });
  await prisma.aluno.update({
    where: { id: aluno.aluno!.id },
    data: {
      consentimento_por: responsavel.id,
      consentimento_em: new Date(),
      restricoes: {
        create: [
          { categoria_codigo: "AMENDOIM", tipo: "ALERGIA", declarada_por: responsavel.id },
          { categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA", declarada_por: responsavel.id },
        ],
      },
    },
  });

  // RF20: um registro já gravado e um responsável por projeto (computador e celular rodam em paralelo).
  await prisma.registroSintoma.create({ data: { aluno_id: aluno.aluno!.id, sintoma_codigo: "ENJOO", data_hora: new Date(Date.now() - 3_600_000) } });
  const senha_hash = await bcrypt.hash("123456", 10);
  for (const projeto of ["desktop", "celular"]) {
    await prisma.usuario.create({
      data: {
        nome: `Responsável ${projeto}`,
        email: `responsavel.${projeto}${DOMINIO_E2E}`,
        papel: "RESPONSAVEL",
        senha_hash,
        vinculos: { create: { aluno_id: aluno.aluno!.id } },
      },
    });
  }

  return async () => {
    await limpar();
    await prisma.$disconnect();
  };
}

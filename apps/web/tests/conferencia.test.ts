import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { conferenciaProvisoria, conferenteProvisorio, situacaoMarcacao } from "@/lib/conferencia";
import { substituicaoMarcadores, valorIg } from "@/lib/validacao";
import { calcularAlergenos, salvarPreparacao } from "@/services/preparacoes";

// Conferentes provisórios ("PENDENTE 1/2") das planilhas: o dado aparece como "não conferido", nunca como conferido.
describe("conferência provisória", () => {
  it("reconhece o marcador provisório, sem confundir com nomes reais", () => {
    expect(conferenteProvisorio("PENDENTE 1")).toBe(true);
    expect(conferenteProvisorio(" pendente 2")).toBe(true);
    expect(conferenteProvisorio("Pendentes")).toBe(false);
    expect(conferenteProvisorio("Ana")).toBe(false);
    expect(conferenteProvisorio(null)).toBe(false);
    expect(conferenciaProvisoria({ conferido_por_1: "Ana", conferido_por_2: "PENDENTE 2" })).toBe(true);
    expect(conferenciaProvisoria({ conferido_por_1: "Ana", conferido_por_2: "Bruno" })).toBe(false);
  });

  it("separa pendente, não conferida, conferida e rótulo", () => {
    const agora = new Date();
    expect(situacaoMarcacao({ origem: "ROTULO", marcacao_conferida_em: null })).toBe("NAO_SE_APLICA");
    expect(situacaoMarcacao({ origem: "TACO", marcacao_conferida_em: null })).toBe("PENDENTE");
    expect(
      situacaoMarcacao({ origem: "TACO", marcacao_conferida_em: agora, marcacao_conferida_por_1: "PENDENTE 1", marcacao_conferida_por_2: "PENDENTE 2" }),
    ).toBe("NAO_CONFERIDA");
    expect(
      situacaoMarcacao({ origem: "OUTRA_TABELA", marcacao_conferida_em: agora, marcacao_conferida_por_1: "Ana", marcacao_conferida_por_2: "Bruno" }),
    ).toBe("CONFERIDA");
  });

  it("não aceita o marcador provisório como nome de quem conferiu", () => {
    expect(substituicaoMarcadores.safeParse({ marcadores: [], conferido_por_1: "PENDENTE 1", conferido_por_2: "Bruno" }).success).toBe(false);
    expect(substituicaoMarcadores.safeParse({ marcadores: [], conferido_por_1: "Ana", conferido_por_2: "Bruno" }).success).toBe(true);
    const ig = { ig: 70, lista: "LISTA_1", item_correspondente: "x", justificativa: "y", conferido_por_1: "Ana" };
    expect(valorIg.safeParse({ ...ig, conferido_por_2: "pendente 2" }).success).toBe(false);
  });
});

describe("ficha com marcação não conferida", () => {
  const NOME = "TESTE CONF Arroz";
  let arroz: { id: number; conf: [string | null, string | null] };
  let prepId: number;

  beforeAll(async () => {
    const a = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } });
    arroz = { id: a.id, conf: [a.marcacao_conferida_por_1, a.marcacao_conferida_por_2] };
    await prisma.ingrediente.update({
      where: { id: a.id },
      data: { marcacao_conferida_por_1: "PENDENTE 1", marcacao_conferida_por_2: "PENDENTE 2", marcacao_conferida_em: new Date() },
    });
    prepId = (
      await salvarPreparacao({
        nome: NOME,
        porcao_g: 100,
        itens: [{ ingrediente_id: a.id, quantidade_crua_g: 100, modo_preparo: "CRU" }],
        contato_cozinha: [],
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.preparacao.deleteMany({ where: { nome: NOME } });
    await prisma.ingrediente.update({
      where: { id: arroz.id },
      data: { marcacao_conferida_por_1: arroz.conf[0], marcacao_conferida_por_2: arroz.conf[1] },
    });
  });

  it("a ficha continua aceitando o alimento, mas lista o que não foi conferido", async () => {
    expect((await calcularAlergenos(prepId)).nao_conferidos).toEqual(["Arroz, tipo 1, cru"]);
  });

  it("depois da conferência real, a lista fica vazia", async () => {
    await prisma.ingrediente.update({ where: { id: arroz.id }, data: { marcacao_conferida_por_1: "Ana", marcacao_conferida_por_2: "Bruno" } });
    expect((await calcularAlergenos(prepId)).nao_conferidos).toEqual([]);
  });
});

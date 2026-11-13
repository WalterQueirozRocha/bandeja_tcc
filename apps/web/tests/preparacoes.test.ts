import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, type Prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as ingrediente from "@/app/api/ingredientes/[id]/route";
import * as preparacoes from "@/app/api/preparacoes/route";
import * as preparacao from "@/app/api/preparacoes/[id]/route";
import * as alergenos from "@/app/api/preparacoes/[id]/alergenos/route";
import * as carga from "@/app/api/preparacoes/[id]/carga-glicemica/route";
import * as composicao from "@/app/api/preparacoes/[id]/composicao/route";

const PREFIXO = "TESTE I2 ";
const REFERENCIA_TESTE = "fator de teste (I2)";
let tokens: Record<"operador" | "aluno", string>;
let ids: { arrozCru: number; arrozCozido: number; farinha: number };
let prepId: number;
// Dados reais das planilhas que o teste troca pelos de exemplo e devolve no fim.
let reais: { fatores: Prisma.FatorPreparoCreateManyInput[]; marcadores: Prisma.MarcadorIngredienteCreateManyInput[]; igs: Prisma.ValorIGCreateManyInput[] };

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();

const ficha = () => ({
  nome: `${PREFIXO}Arroz com farinha`,
  porcao_g: 150,
  itens: [
    { ingrediente_id: ids.arrozCru, quantidade_crua_g: 100, modo_preparo: "COZIDO" },
    { ingrediente_id: ids.farinha, quantidade_crua_g: 50, modo_preparo: "CRU" },
  ],
  contato_cozinha: [{ categoria_codigo: "AMENDOIM", motivo: "mesmo óleo" }],
});

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = { operador: await token("operador@gmail.com"), aluno: await token("aluno@gmail.com") };
  const id = async (codigo_taco: number) => (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco } })).id;
  ids = { arrozCru: await id(4), arrozCozido: await id(3), farinha: await id(35) };

  // Dados de exemplo no lugar dos reais: fator dos cereais 2,5; farinha só com trigo e glúten, sem IG; arroz cozido com IG 73.
  const fatorCereais = { grupo_alimentar: "CEREAIS" as const, modo_preparo: "COZIDO" as const };
  const comIg = { ingrediente_id: { in: [ids.arrozCozido, ids.farinha] } };
  reais = {
    fatores: await prisma.fatorPreparo.findMany({ where: fatorCereais }),
    marcadores: await prisma.marcadorIngrediente.findMany({ where: { ingrediente_id: ids.farinha } }),
    igs: await prisma.valorIG.findMany({ where: comIg }),
  };
  await prisma.fatorPreparo.deleteMany({ where: fatorCereais });
  await prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id: ids.farinha } });
  await prisma.valorIG.deleteMany({ where: comIg });
  await prisma.fatorPreparo.create({ data: { grupo_alimentar: "CEREAIS", modo_preparo: "COZIDO", fator_coccao: 2.5, referencia: REFERENCIA_TESTE } });
  await prisma.marcadorIngrediente.createMany({
    data: ["TRIGO", "GLUTEN"].map((categoria_codigo) => ({
      ingrediente_id: ids.farinha, categoria_codigo, presenca: "CONTEM" as const, origem: "MAPEAMENTO" as const, conferido_por_1: "Ana", conferido_por_2: "Bruno",
    })),
  });
  await prisma.valorIG.create({
    data: { ingrediente_id: ids.arrozCozido, ig: 73, item_correspondente: "Rice, white, boiled", lista: "LISTA_1", justificativa: "teste", conferido_por_1: "Ana", conferido_por_2: "Bruno" },
  });
});

afterAll(async () => {
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.fatorPreparo.deleteMany({ where: { referencia: REFERENCIA_TESTE } });
  await prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id: ids.farinha } });
  await prisma.valorIG.deleteMany({ where: { ingrediente_id: ids.arrozCozido } });
  await prisma.fatorPreparo.createMany({ data: reais.fatores });
  await prisma.marcadorIngrediente.createMany({ data: reais.marcadores });
  await prisma.valorIG.createMany({ data: reais.igs });
  await prisma.$disconnect();
});

describe("modos disponíveis no detalhe do ingrediente", () => {
  it("arroz cru oferece CRU e COZIDO (há fator para cereais)", async () => {
    const corpo = await json(await ingrediente.GET(req(`/api/ingredientes/${ids.arrozCru}`, tokens.aluno), ctx(ids.arrozCru)));
    expect(corpo.modos_disponiveis).toEqual(["CRU", "COZIDO"]);
  });

  it("com forma preparada na TACO, só os modos dela, mesmo sem fator: pão de queijo cru → CRU e ASSADO", async () => {
    const paoDeQueijo = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 141 } })).id;
    const corpo = await json(await ingrediente.GET(req(`/api/ingredientes/${paoDeQueijo}`, tokens.aluno), ctx(paoDeQueijo)));
    expect(corpo.modos_disponiveis).toEqual(["CRU", "ASSADO"]);
  });

  it("arroz cozido (forma preparada) não é oferecido", async () => {
    const corpo = await json(await ingrediente.GET(req(`/api/ingredientes/${ids.arrozCozido}`, tokens.aluno), ctx(ids.arrozCozido)));
    expect(corpo.modos_disponiveis).toEqual([]);
  });
});

describe("POST /api/preparacoes", () => {
  const post = (token: string, body: unknown) => preparacoes.POST(req("/api/preparacoes", token, { method: "POST", body }));

  it("aluno → 403", async () => {
    expect((await post(tokens.aluno, ficha())).status).toBe(403);
  });

  it("operador cria e o peso final é calculado (100 × 2,5 + 50)", async () => {
    const res = await post(tokens.operador, ficha());
    expect(res.status).toBe(201);
    prepId = (await json(res)).id;
    expect((await prisma.preparacao.findUniqueOrThrow({ where: { id: prepId } })).peso_final_calculado).toBe(300);
  });

  it("CT02: modo sem fator nem forma frita → 422", async () => {
    const corpo = { ...ficha(), itens: [{ ingrediente_id: ids.arrozCru, quantidade_crua_g: 100, modo_preparo: "FRITO" }] };
    const res = await post(tokens.operador, corpo);
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/modo FRITO não disponível/);
  });

  it("forma preparada da TACO → 422 indicando o cru + modo", async () => {
    const corpo = { ...ficha(), itens: [{ ingrediente_id: ids.arrozCozido, quantidade_crua_g: 100, modo_preparo: "CRU" }] };
    const res = await post(tokens.operador, corpo);
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/já é uma forma preparada.*COZIDO/);
  });

  // Revisão 09/11: porção acima do peso final (300 g) + 0,5 g de tolerância é recusada.
  it("porção maior que o peso final da receita → 422", async () => {
    const res = await post(tokens.operador, { ...ficha(), nome: `${PREFIXO}Porção grande`, porcao_g: 300.6 });
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/Porção de 300.6 g maior que o peso final da receita \(300.0 g\)/);
  });

  it("porção até 0,5 g acima do peso final é aceita (arredondamento)", async () => {
    const res = await post(tokens.operador, { ...ficha(), nome: `${PREFIXO}Porção no limite`, porcao_g: 300.4 });
    expect(res.status).toBe(201);
    // Sai logo: a "lista com busca" conta as preparações do prefixo.
    await prisma.preparacao.delete({ where: { id: (await json(res)).id } });
  });

  it("ingrediente repetido → 400", async () => {
    const item = { ingrediente_id: ids.farinha, quantidade_crua_g: 10, modo_preparo: "CRU" };
    expect((await post(tokens.operador, { ...ficha(), itens: [item, item] })).status).toBe(400);
  });

  it("categoria de cozinha inexistente → 422", async () => {
    const corpo = { ...ficha(), contato_cozinha: [{ categoria_codigo: "XYZ", motivo: "x" }] };
    expect((await post(tokens.operador, corpo)).status).toBe(422);
  });

  // D6 / FC-02: a recusa vale para o alimento e para a forma preparada que o modo usa.
  it.each([
    ["alimento da TACO", () => ids.farinha, /Farinha, de trigo: marcação de alergênicos ainda não conferida/],
    ["forma cozida usada pelo modo", () => ids.arrozCozido, /Arroz, tipo 1, cozido: marcação de alergênicos ainda não conferida/],
  ])("%s sem conferência → 422 (D6)", async (_, alvo, mensagem) => {
    const conferencia = await prisma.ingrediente.findUniqueOrThrow({ where: { id: alvo() } });
    const limpar = { marcacao_conferida_por_1: null, marcacao_conferida_por_2: null, marcacao_conferida_em: null };
    await prisma.ingrediente.update({ where: { id: alvo() }, data: limpar });
    try {
      const res = await post(tokens.operador, { ...ficha(), nome: `${PREFIXO}Sem conferência` });
      expect(res.status).toBe(422);
      expect((await json(res)).erro).toMatch(mensagem);
    } finally {
      const { marcacao_conferida_por_1, marcacao_conferida_por_2, marcacao_conferida_em } = conferencia;
      await prisma.ingrediente.update({ where: { id: alvo() }, data: { marcacao_conferida_por_1, marcacao_conferida_por_2, marcacao_conferida_em } });
    }
  });
});

describe("cálculos da preparação", () => {
  it("ficha técnica", async () => {
    const corpo = await json(await preparacao.GET(req(`/api/preparacoes/${prepId}`, tokens.aluno), ctx(prepId)));
    expect(corpo.itens.map((i: { nome: string; modo_preparo: string }) => `${i.nome}/${i.modo_preparo}`)).toEqual([
      "Arroz, tipo 1, cru/COZIDO",
      "Farinha, de trigo/CRU",
    ]);
    expect(corpo.contato_cozinha).toEqual([{ categoria_codigo: "AMENDOIM", motivo: "mesmo óleo" }]);
  });

  it("composição usa a forma cozida da TACO para o arroz", async () => {
    const corpo = await json(await composicao.GET(req(`/api/preparacoes/${prepId}/composicao`, tokens.aluno), ctx(prepId)));
    expect(corpo.peso_final_g).toBe(300);
    // arroz: 250 g × 28,06/100; farinha: 50 g × 75,09/100
    expect(corpo.total.carboidrato_g).toBeCloseTo(250 * 0.2805985 + 50 * 0.7509255, 3);
    expect(corpo.hipoteses).toContain("Arroz, tipo 1, cru (COZIDO): composição da forma preparada na TACO; fator de cocção 2.5");
  });

  it("alergênicos com origens, incluindo o contato na cozinha (RF03)", async () => {
    const corpo = await json(await alergenos.GET(req(`/api/preparacoes/${prepId}/alergenos`, tokens.aluno), ctx(prepId)));
    expect(corpo.alergenos).toEqual([
      { categoria: "AMENDOIM", nome: "Amendoim", presenca: "PODE_CONTER", origens: ["contato na cozinha"] },
      { categoria: "GLUTEN", nome: "Glúten", presenca: "CONTEM", origens: ["Farinha, de trigo"] },
      { categoria: "TRIGO", nome: "Trigo", presenca: "CONTEM", origens: ["Farinha, de trigo"] },
    ]);
  });

  it("carga glicêmica: Rytz calculado; FAO não calculado (farinha sem IG)", async () => {
    const corpo = await json(await carga.GET(req(`/api/preparacoes/${prepId}/carga-glicemica`, tokens.aluno), ctx(prepId)));
    expect(corpo.rotulo).toBe("estimativa");
    expect(corpo.rytz.ig).toBeGreaterThan(0);
    expect(corpo.fao).toBeNull();
    expect(corpo.motivo_fao).toBe("sem IG pareado: Farinha, de trigo");
    expect(corpo.carboidrato_disponivel_g).toBeGreaterThan(0);
  });

  it("PUT substitui a ficha; só com o arroz, a FAO usa o IG pareado do arroz cozido", async () => {
    const corpo = { ...ficha(), itens: [ficha().itens[0]], contato_cozinha: [] };
    expect((await preparacao.PUT(req(`/api/preparacoes/${prepId}`, tokens.operador, { method: "PUT", body: corpo }), ctx(prepId))).status).toBe(200);
    const cg = await json(await carga.GET(req(`/api/preparacoes/${prepId}/carga-glicemica`, tokens.aluno), ctx(prepId)));
    expect(cg.fao.ig).toBe(73);
    const alerg = await json(await alergenos.GET(req(`/api/preparacoes/${prepId}/alergenos`, tokens.aluno), ctx(prepId)));
    expect(alerg.alergenos).toEqual([]);
  });

  it("PUT por aluno → 403; inexistente → 404", async () => {
    expect((await preparacao.PUT(req(`/api/preparacoes/${prepId}`, tokens.aluno, { method: "PUT", body: ficha() }), ctx(prepId))).status).toBe(403);
    expect((await composicao.GET(req("/api/preparacoes/999999/composicao", tokens.aluno), ctx(999999))).status).toBe(404);
    expect((await preparacao.GET(req("/api/preparacoes/999999", tokens.aluno), ctx(999999))).status).toBe(404);
  });

  it("lista com busca", async () => {
    const corpo = await json(await preparacoes.GET(req(`/api/preparacoes?busca=${encodeURIComponent(PREFIXO)}`, tokens.aluno)));
    expect(corpo).toHaveLength(1);
  });
});

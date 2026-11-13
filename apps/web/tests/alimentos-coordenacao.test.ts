import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { importarTaco } from "@bandeja/dados/src/importadores";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as ingredientes from "@/app/api/ingredientes/route";
import * as ingrediente from "@/app/api/ingredientes/[id]/route";
import * as alteracoes from "@/app/api/ingredientes/[id]/alteracoes/route";
import * as preparacoes from "@/app/api/preparacoes/route";

// 04/11: coordenação e operador cadastram e editam alimentos, com registro; outra tabela e complemento da TACO.
const PREFIXO = "TESTE AC ";
let tokens: Record<"operador" | "coordenacao" | "aluno", string>;
let semComposicao: { id: number; nome: string }; // alimento da TACO com "*"
let arrozTaco: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const criar = (token: string, body: object) => ingredientes.POST(req("/api/ingredientes", token, { method: "POST", body }));
const editar = (token: string, id: number, body: object) => ingrediente.PUT(req("/x", token, { method: "PUT", body }), ctx(id));
const historico = (token: string, id: number) => alteracoes.GET(req("/x", token), ctx(id));

const tbca = {
  nome: `${PREFIXO}Leite integral (TBCA)`,
  grupo_alimentar: "LEITE",
  categoria_carboidrato: "LACTOSE",
  carboidrato_g: 4.6,
  origem: "OUTRA_TABELA",
  fonte: "TBCA 7.2, código C0001",
  marcadores: [{ categoria_codigo: "LEITE", presenca: "CONTEM" }],
};

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = { operador: await token("operador@gmail.com"), coordenacao: await token("coordenacao@gmail.com"), aluno: await token("aluno@gmail.com") };
  semComposicao = await prisma.ingrediente.findFirstOrThrow({ where: { origem: "TACO", energia_kcal: null, carboidrato_g: null }, select: { id: true, nome: true } });
  arrozTaco = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } })).id;
});

afterAll(async () => {
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.ingrediente.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.alteracaoIngrediente.deleteMany({ where: { ingrediente_id: { in: [semComposicao.id, arrozTaco] } } });
  await prisma.$executeRaw`UPDATE "Ingrediente" SET carboidrato_g = NULL, fibra_g = NULL, complementos = NULL WHERE id = ${semComposicao.id}`;
  await prisma.$disconnect();
});

describe("cadastro de alimento (04/11)", () => {
  it("aluno → 403; coordenação cadastra de outra tabela, com marcação pendente e registro da criação", async () => {
    expect((await criar(tokens.aluno, tbca)).status).toBe(403);
    const res = await criar(tokens.coordenacao, tbca);
    expect(res.status).toBe(201);
    const criado = await json(res);
    expect(criado).toMatchObject({ origem: "OUTRA_TABELA", fonte: tbca.fonte, marcacao_conferida_em: null });
    expect(criado.marcadores).toMatchObject([{ categoria_codigo: "LEITE", origem: "MAPEAMENTO" }]);

    const lista = await json(await historico(tokens.coordenacao, criado.id));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ acao: "CRIACAO", usuario: { papel: "COORDENACAO" }, motivo: null });
    expect(lista[0].campos).toEqual(expect.arrayContaining([{ campo: "fonte", antes: null, depois: tbca.fonte }, { campo: "carboidrato_g", antes: null, depois: 4.6 }]));
  });

  it("outra tabela exige a fonte; rótulo não aceita fonte", async () => {
    expect((await criar(tokens.operador, { ...tbca, nome: `${PREFIXO}Sem fonte`, fonte: undefined })).status).toBe(400);
    expect((await criar(tokens.operador, { ...tbca, nome: `${PREFIXO}Rótulo com fonte`, origem: "ROTULO" })).status).toBe(400);
  });

  it("D6: a ficha recusa alimento de outra tabela sem a conferência da marcação", async () => {
    const { id } = await json(await criar(tokens.operador, { ...tbca, nome: `${PREFIXO}Para ficha` }));
    const res = await preparacoes.POST(
      req("/api/preparacoes", tokens.operador, {
        method: "POST",
        body: { nome: `${PREFIXO}Vitamina`, porcao_g: 200, itens: [{ ingrediente_id: id, quantidade_crua_g: 200, modo_preparo: "CRU" }] },
      }),
    );
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/marcação de alergênicos ainda não conferida/);
  });
});

describe("edição com registro (04/11)", () => {
  it("exige motivo; registra antes → depois e quem editou; sem mudança → 422", async () => {
    const { id } = await json(await criar(tokens.operador, { ...tbca, nome: `${PREFIXO}Para editar` }));
    expect((await editar(tokens.coordenacao, id, { carboidrato_g: 5 })).status).toBe(400);
    expect((await editar(tokens.aluno, id, { carboidrato_g: 5, motivo: "x" })).status).toBe(403);

    const res = await editar(tokens.coordenacao, id, { carboidrato_g: 5, fonte: "TBCA 7.2, código C0002", motivo: "valor revisado" });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ carboidrato_g: 5, fonte: "TBCA 7.2, código C0002" });

    const [ultima, primeira] = await json(await historico(tokens.operador, id));
    expect(primeira.acao).toBe("CRIACAO");
    expect(ultima).toMatchObject({ acao: "EDICAO", motivo: "valor revisado", usuario: { papel: "COORDENACAO" } });
    expect(ultima.campos).toEqual([
      { campo: "carboidrato_g", antes: 4.6, depois: 5 },
      { campo: "fonte", antes: tbca.fonte, depois: "TBCA 7.2, código C0002" },
    ]);
    expect((await historico(tokens.aluno, id)).status).toBe(403);

    const igual = await editar(tokens.operador, id, { carboidrato_g: 5, motivo: "nada" });
    expect(igual.status).toBe(422);
    expect((await json(igual)).erro).toMatch(/Nenhum valor mudou/);
  });
});

describe("complemento da TACO (04/11)", () => {
  it("só os campos não analisados, com fonte; continua depois de reimportar; apagar devolve ao não analisado", async () => {
    expect((await editar(tokens.coordenacao, arrozTaco, { carboidrato_g: 1, fonte: "TBCA", motivo: "x" })).status).toBe(422);
    expect((await editar(tokens.coordenacao, semComposicao.id, { carboidrato_g: 4.6, motivo: "sem fonte" })).status).toBe(422);
    expect((await editar(tokens.coordenacao, semComposicao.id, { categoria_carboidrato: "LACTOSE", fonte: "TBCA", motivo: "fonte solta" })).status).toBe(422);

    const res = await editar(tokens.coordenacao, semComposicao.id, { carboidrato_g: 4.6, fibra_g: 0, fonte: "TBCA 7.2, código C0001", motivo: "TACO sem análise" });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ carboidrato_g: 4.6, fibra_g: 0, complementos: { carboidrato_g: "TBCA 7.2, código C0001", fibra_g: "TBCA 7.2, código C0001" } });
    const [registro] = await json(await historico(tokens.operador, semComposicao.id));
    expect(registro.campos).toContainEqual({ campo: "carboidrato_g", antes: null, depois: 4.6, fonte: "TBCA 7.2, código C0001" });

    await importarTaco();
    expect(await prisma.ingrediente.findUniqueOrThrow({ where: { id: semComposicao.id } })).toMatchObject({ carboidrato_g: 4.6, fibra_g: 0 });

    // O campo complementado pode ser corrigido; apagado, volta a "não analisado".
    expect((await editar(tokens.operador, semComposicao.id, { carboidrato_g: 4.8, fonte: "TBCA 7.2, código C0001", motivo: "correção" })).status).toBe(200);
    const apagado = await json(await editar(tokens.operador, semComposicao.id, { fibra_g: null, motivo: "sem dado" }));
    expect(apagado).toMatchObject({ fibra_g: null, complementos: { carboidrato_g: "TBCA 7.2, código C0001" } });
    expect(apagado.complementos).not.toHaveProperty("fibra_g");
  });
});

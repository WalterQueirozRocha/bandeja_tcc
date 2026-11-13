import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as categorias from "@/app/api/categorias/route";
import * as ingredientes from "@/app/api/ingredientes/route";
import * as detalhe from "@/app/api/ingredientes/[id]/route";
import * as marcadores from "@/app/api/ingredientes/[id]/marcadores/route";

const PREFIXO = "TESTE I1 ";
let tokens: Record<"operador" | "aluno", string>;
let arrozCozido: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}

const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

async function entrar(email: string, senha = SENHA_TESTE) {
  return login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha } }));
}

beforeAll(async () => {
  const token = async (email: string) => ((await (await entrar(email)).json()) as { token: string }).token;
  tokens = { operador: await token("operador@gmail.com"), aluno: await token("aluno@gmail.com") };
  arrozCozido = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 3 } })).id;
});

afterAll(async () => {
  await prisma.ingrediente.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.marcadorIngrediente.deleteMany({ where: { ingrediente_id: arrozCozido } });
  await prisma.$disconnect();
});

describe("POST /api/auth/login", () => {
  it("senha errada → 401", async () => {
    expect((await entrar("operador@gmail.com", "errada")).status).toBe(401);
  });

  it("e-mail inexistente → 401 com a mesma mensagem", async () => {
    const res = await entrar("ninguem@bandeja.test");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ erro: "E-mail ou senha inválidos" });
  });

  it("credenciais certas → token e cookie httpOnly", async () => {
    const res = await entrar("operador@gmail.com");
    expect(res.status).toBe(200);
    expect((await res.json()).usuario.papel).toBe("OPERADOR");
    expect(res.headers.get("set-cookie")).toMatch(/bandeja_sessao=.+HttpOnly/);
  });
});

describe("GET /api/ingredientes", () => {
  it("sem token → 401", async () => {
    expect((await ingredientes.GET(req("/api/ingredientes"))).status).toBe(401);
  });

  it("token inválido → 401", async () => {
    expect((await ingredientes.GET(req("/api/ingredientes", "abc"))).status).toBe(401);
  });

  it("aluno consulta e busca por nome", async () => {
    const res = await ingredientes.GET(req("/api/ingredientes?busca=arroz, tipo 1", tokens.aluno));
    expect(res.status).toBe(200);
    const corpo = await res.json();
    expect(corpo.itens.map((i: { nome: string }) => i.nome)).toEqual(["Arroz, tipo 1, cozido", "Arroz, tipo 1, cru"]);
  });

  it("aceita o cookie de sessão", async () => {
    const r = new Request("http://teste/api/ingredientes?grupo=FRUTAS&tamanho=1", {
      headers: { cookie: `outro=1; bandeja_sessao=${tokens.aluno}` },
    });
    const corpo = await (await ingredientes.GET(r)).json();
    expect(corpo.tamanho).toBe(1);
    expect(corpo.itens[0].grupo_alimentar).toBe("FRUTAS");
  });

  it("filtro inválido → 400", async () => {
    expect((await ingredientes.GET(req("/api/ingredientes?grupo=XYZ", tokens.aluno))).status).toBe(400);
  });
});

describe("GET /api/ingredientes/[id]", () => {
  it("traz composição e a ligação com a forma crua", async () => {
    const res = await detalhe.GET(req(`/api/ingredientes/${arrozCozido}`, tokens.aluno), ctx(arrozCozido));
    const corpo = await res.json();
    expect(corpo.modo_preparo).toBe("COZIDO");
    expect(corpo.forma_crua.nome).toBe("Arroz, tipo 1, cru");
    expect(corpo.carboidrato_g).toBeCloseTo(28.06, 2);
  });

  it("inexistente → 404", async () => {
    expect((await detalhe.GET(req("/api/ingredientes/999999", tokens.aluno), ctx(999999))).status).toBe(404);
  });
});

describe("POST /api/ingredientes (rótulo)", () => {
  const rotulo = {
    nome: `${PREFIXO}Biscoito recheado`,
    grupo_alimentar: "OUTROS_INDUSTRIALIZADOS",
    categoria_carboidrato: "SACAROSE",
    carboidrato_g: 70,
    fibra_g: 2,
    marcadores: [
      { categoria_codigo: "TRIGO", presenca: "CONTEM" },
      { categoria_codigo: "GLUTEN", presenca: "CONTEM" },
      { categoria_codigo: "AMENDOIM", presenca: "PODE_CONTER" },
    ],
  };

  it("aluno → 403", async () => {
    expect((await ingredientes.POST(req("/api/ingredientes", tokens.aluno, { method: "POST", body: rotulo }))).status).toBe(403);
  });

  it("operador cadastra com marcadores de origem ROTULO", async () => {
    const res = await ingredientes.POST(req("/api/ingredientes", tokens.operador, { method: "POST", body: rotulo }));
    expect(res.status).toBe(201);
    const corpo = await res.json();
    expect(corpo.origem).toBe("ROTULO");
    expect(corpo.marcadores).toHaveLength(3);
    expect(corpo.marcadores.every((m: { origem: string }) => m.origem === "ROTULO")).toBe(true);
  });

  it("S1: trigo sem glúten → 422", async () => {
    const corpo = { ...rotulo, marcadores: [{ categoria_codigo: "TRIGO", presenca: "CONTEM" }] };
    expect((await ingredientes.POST(req("/api/ingredientes", tokens.operador, { method: "POST", body: corpo }))).status).toBe(422);
  });

  it("categoria inexistente → 422", async () => {
    const corpo = { ...rotulo, marcadores: [{ categoria_codigo: "XYZ", presenca: "CONTEM" }] };
    expect((await ingredientes.POST(req("/api/ingredientes", tokens.operador, { method: "POST", body: corpo }))).status).toBe(422);
  });

  it("corpo inválido → 400 com os campos", async () => {
    const res = await ingredientes.POST(req("/api/ingredientes", tokens.operador, { method: "POST", body: { nome: "" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).detalhes.map((d: { campo: string }) => d.campo)).toContain("grupo_alimentar");
  });
});

describe("PUT /api/ingredientes/[id]/marcadores", () => {
  const put = (token: string, id: number, body: unknown) =>
    marcadores.PUT(req(`/api/ingredientes/${id}/marcadores`, token, { method: "PUT", body }), ctx(id));

  it("aluno → 403", async () => {
    expect((await put(tokens.aluno, arrozCozido, { marcadores: [] })).status).toBe(403);
  });

  it("TACO sem conferência dupla → 422", async () => {
    const marcadoresLeite = [{ categoria_codigo: "LEITE", presenca: "PODE_CONTER" }];
    expect((await put(tokens.operador, arrozCozido, { marcadores: marcadoresLeite, conferido_por_1: "Ana", conferido_por_2: "ana" })).status).toBe(422);
    expect((await put(tokens.operador, arrozCozido, { marcadores: marcadoresLeite, conferido_por_1: "Ana" })).status).toBe(422);
  });

  it("TACO com conferência dupla → marcadores de MAPEAMENTO e a conferência no ingrediente (D6)", async () => {
    const res = await put(tokens.operador, arrozCozido, {
      marcadores: [{ categoria_codigo: "LEITE", presenca: "PODE_CONTER" }],
      conferido_por_1: "Ana",
      conferido_por_2: "Bruno",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject([{ categoria_codigo: "LEITE", origem: "MAPEAMENTO", conferido_por_1: "Ana", conferido_por_2: "Bruno" }]);
    expect(await prisma.ingrediente.findUniqueOrThrow({ where: { id: arrozCozido } })).toMatchObject({
      marcacao_conferida_por_1: "Ana",
      marcacao_conferida_por_2: "Bruno",
      marcacao_conferida_em: expect.any(Date),
    });
  });

  it("TACO com lista vazia e conferência → conferido, sem alergênico (D6)", async () => {
    const antes = new Date();
    const res = await put(tokens.operador, arrozCozido, { marcadores: [], conferido_por_1: "Carla", conferido_por_2: "Davi" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    const i = await prisma.ingrediente.findUniqueOrThrow({ where: { id: arrozCozido } });
    expect(i.marcacao_conferida_por_1).toBe("Carla");
    expect(i.marcacao_conferida_em!.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
  });

  it("rótulo não exige conferência (D6)", async () => {
    const criado = await ingredientes.POST(
      req("/api/ingredientes", tokens.operador, { method: "POST", body: { nome: `${PREFIXO}Rótulo D6`, grupo_alimentar: "CEREAIS", categoria_carboidrato: "AMIDO" } }),
    );
    const { id } = await criado.json();
    expect((await put(tokens.operador, id, { marcadores: [{ categoria_codigo: "SOJA", presenca: "CONTEM" }] })).status).toBe(200);
    expect((await prisma.ingrediente.findUniqueOrThrow({ where: { id } })).marcacao_conferida_em).toBeNull();
  });

  it("inexistente → 404", async () => {
    expect((await put(tokens.operador, 999999, { marcadores: [] })).status).toBe(404);
  });
});

describe("GET /api/categorias", () => {
  it("lista as 27 categorias", async () => {
    expect(await (await categorias.GET(req("/api/categorias", tokens.aluno))).json()).toHaveLength(27);
  });
});

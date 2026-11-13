import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as sessao from "@/app/api/auth/sessao/route";
import * as perfil from "@/app/api/alunos/[id]/perfil/route";
import * as cardapios from "@/app/api/cardapios/route";
import * as cardapio from "@/app/api/cardapios/[id]/route";

const PREFIXO = "TESTE I3 ";
const DATA = "2099-01-01";
const OUTRO_RESPONSAVEL = "outro.responsavel@gmail.com";
type Papel = "operador" | "aluno" | "responsavel" | "coordenacao" | "outro";
let tokens: Record<Papel, string>;
let alunoId: number;
let preps: { amendoim: number; arroz: number; leite: number };
let cardapioId: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();

// Preparação de exemplo cujo alergênico vem do "contato na cozinha" (não depende das planilhas da equipe).
async function criarPreparacao(nome: string, codigoTaco: number, cozinha: string[]) {
  const ingrediente = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: codigoTaco } });
  const p = await prisma.preparacao.create({
    data: {
      nome: PREFIXO + nome,
      porcao_g: 100,
      peso_final_calculado: 100,
      itens: { create: [{ ingrediente_id: ingrediente.id, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
      marcadores_cozinha: { create: cozinha.map((categoria_codigo) => ({ categoria_codigo, presenca: "PODE_CONTER" as const, motivo: "teste" })) },
    },
  });
  return p.id;
}

const itensDoCardapio = () => [
  { preparacao_id: preps.amendoim, preco: 6.5 },
  { preparacao_id: preps.arroz, preco: 4 },
  { preparacao_id: preps.leite, preco: 3 },
];

beforeAll(async () => {
  await prisma.usuario.upsert({
    where: { email: OUTRO_RESPONSAVEL },
    update: {},
    create: { email: OUTRO_RESPONSAVEL, nome: "Outro Responsável", papel: "RESPONSAVEL", senha_hash: await bcrypt.hash(SENHA_TESTE, 10) },
  });
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = {
    operador: await token("operador@gmail.com"),
    aluno: await token("aluno@gmail.com"),
    responsavel: await token("responsavel@gmail.com"),
    coordenacao: await token("coordenacao@gmail.com"),
    outro: await token(OUTRO_RESPONSAVEL),
  };
  const usuarioAluno = await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } });
  alunoId = usuarioAluno.aluno!.id;
  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({ where: { id: alunoId }, data: { consentimento_por: null, consentimento_em: null } });
  preps = {
    amendoim: await criarPreparacao("Pão com amendoim", 35, ["AMENDOIM"]),
    arroz: await criarPreparacao("Arroz", 4, []),
    leite: await criarPreparacao("Mingau", 4, ["LACTOSE"]),
  };
});

afterAll(async () => {
  await prisma.cardapio.deleteMany({ where: { data: new Date(`${DATA}T00:00:00Z`) } });
  await prisma.cardapio.deleteMany({ where: { data: { gte: new Date("2099-01-09T00:00:00Z"), lte: new Date("2099-01-18T00:00:00Z") } } });
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({ where: { id: alunoId }, data: { consentimento_por: null, consentimento_em: null } });
  await prisma.usuario.deleteMany({ where: { email: OUTRO_RESPONSAVEL } });
  await prisma.$disconnect();
});

describe("GET /api/auth/sessao", () => {
  it("aluno recebe o próprio aluno_id; responsável, os alunos vinculados", async () => {
    expect((await json(await sessao.GET(req("/api/auth/sessao", tokens.aluno)))).aluno_id).toBe(alunoId);
    const resp = await json(await sessao.GET(req("/api/auth/sessao", tokens.responsavel)));
    expect(resp.alunos.map((a: { id: number }) => a.id)).toEqual([alunoId]);
    expect((await json(await sessao.GET(req("/api/auth/sessao", tokens.outro)))).alunos).toEqual([]);
  });
});

describe("POST /api/cardapios (RF05)", () => {
  const post = (token: string, body: unknown) => cardapios.POST(req("/api/cardapios", token, { method: "POST", body }));

  it("aluno → 403", async () => {
    expect((await post(tokens.aluno, { data: DATA, periodo: "MANHA", itens: itensDoCardapio() })).status).toBe(403);
  });

  it("operador publica", async () => {
    const res = await post(tokens.operador, { data: DATA, periodo: "MANHA", itens: itensDoCardapio() });
    expect(res.status).toBe(201);
    cardapioId = (await json(res)).id;
  });

  it("mesma data e turno → 422", async () => {
    expect((await post(tokens.operador, { data: DATA, periodo: "MANHA", itens: itensDoCardapio() })).status).toBe(422);
  });

  it("preparação inexistente → 422; repetida → 400", async () => {
    expect((await post(tokens.operador, { data: DATA, periodo: "TARDE", itens: [{ preparacao_id: 999999, preco: 1 }] })).status).toBe(422);
    const repetida = [{ preparacao_id: preps.arroz, preco: 1 }, { preparacao_id: preps.arroz, preco: 2 }];
    expect((await post(tokens.operador, { data: DATA, periodo: "TARDE", itens: repetida })).status).toBe(400);
  });

  it("lista por data", async () => {
    const lista = await json(await cardapios.GET(req(`/api/cardapios?data=${DATA}`, tokens.aluno)));
    expect(lista).toEqual([{ id: cardapioId, data: DATA, periodo: "MANHA", ativo: true, itens: 3 }]);
  });

  // 09/01/2099 é sexta: o intervalo até quarta (14) tem 4 dias úteis.
  it("com `ate`, publica um por dia útil, sem sábado e domingo", async () => {
    const res = await post(tokens.operador, { data: "2099-01-09", ate: "2099-01-14", periodo: "MANHA", itens: itensDoCardapio() });
    expect(res.status).toBe(201);
    expect((await json(res)).ids).toHaveLength(4);
    const datas = await prisma.cardapio.findMany({
      where: { data: { gte: new Date("2099-01-09T00:00:00Z"), lte: new Date("2099-01-14T00:00:00Z") }, periodo: "MANHA" },
      select: { data: true, _count: { select: { itens: true } } },
      orderBy: { data: "asc" },
    });
    expect(datas.map((c) => [c.data.toISOString().slice(0, 10), c._count.itens])).toEqual([
      ["2099-01-09", 3],
      ["2099-01-12", 3],
      ["2099-01-13", 3],
      ["2099-01-14", 3],
    ]);
  });

  it("um dia ocupado no intervalo → 422 e nada é criado", async () => {
    expect((await post(tokens.operador, { data: "2099-01-13", periodo: "TARDE", itens: itensDoCardapio() })).status).toBe(201);
    const res = await post(tokens.operador, { data: "2099-01-09", ate: "2099-01-14", periodo: "TARDE", itens: itensDoCardapio() });
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toContain("2099-01-13");
    expect(await prisma.cardapio.count({ where: { data: new Date("2099-01-09T00:00:00Z"), periodo: "TARDE" } })).toBe(0);
  });

  it("só fim de semana → 422; `ate` antes da data → 400", async () => {
    expect((await post(tokens.operador, { data: "2099-01-17", ate: "2099-01-18", periodo: "MANHA", itens: itensDoCardapio() })).status).toBe(422);
    expect((await post(tokens.operador, { data: "2099-01-14", ate: "2099-01-13", periodo: "TARDE", itens: itensDoCardapio() })).status).toBe(400);
  });
});

describe("perfil de saúde (RF06, CT21)", () => {
  const caminho = () => `/api/alunos/${alunoId}/perfil`;
  const put = (token: string, body: unknown) => perfil.PUT(req(caminho(), token, { method: "PUT", body }), ctx(alunoId));

  it("CT21: operador e coordenação → 403", async () => {
    expect((await perfil.GET(req(caminho(), tokens.operador), ctx(alunoId))).status).toBe(403);
    expect((await perfil.GET(req(caminho(), tokens.coordenacao), ctx(alunoId))).status).toBe(403);
  });

  it("responsável não vinculado → 403; aluno de outro → 403", async () => {
    expect((await perfil.GET(req(caminho(), tokens.outro), ctx(alunoId))).status).toBe(403);
    expect((await put(tokens.outro, { consentimento: true, restricoes: [] })).status).toBe(403);
    expect((await perfil.GET(req("/api/alunos/999999/perfil", tokens.aluno), ctx(999999))).status).toBe(403);
  });

  it("aluno não edita o próprio perfil → 403", async () => {
    expect((await put(tokens.aluno, { consentimento: true, restricoes: [] })).status).toBe(403);
  });

  it("sem consentimento → 422", async () => {
    const res = await put(tokens.responsavel, { restricoes: [{ categoria_codigo: "AMENDOIM", tipo: "ALERGIA" }] });
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/consentimento/);
  });

  it("doença celíaca fora de GLUTEN e limite em exclusão estrita → 422", async () => {
    expect((await put(tokens.responsavel, { consentimento: true, restricoes: [{ categoria_codigo: "TRIGO", tipo: "DOENCA_CELIACA" }] })).status).toBe(422);
    expect((await put(tokens.responsavel, { consentimento: true, restricoes: [{ categoria_codigo: "OVOS", tipo: "ALERGIA", limite_notificacao: 3 }] })).status).toBe(422);
  });

  it("responsável grava com consentimento; aluno consulta o próprio", async () => {
    const res = await put(tokens.responsavel, {
      consentimento: true,
      restricoes: [
        { categoria_codigo: "AMENDOIM", tipo: "ALERGIA" },
        { categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA", limite_notificacao: 3 },
      ],
    });
    expect(res.status).toBe(200);
    const corpo = await json(await perfil.GET(req(caminho(), tokens.aluno), ctx(alunoId)));
    expect(corpo.consentimento).not.toBeNull();
    expect(corpo.restricoes).toMatchObject([
      { categoria_codigo: "AMENDOIM", tipo: "ALERGIA", limite_notificacao: null },
      { categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA", limite_notificacao: 3 },
    ]);
  });

  it("depois do consentimento, editar não exige a flag de novo", async () => {
    const res = await put(tokens.responsavel, {
      restricoes: [
        { categoria_codigo: "AMENDOIM", tipo: "ALERGIA" },
        { categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA" },
      ],
    });
    expect(res.status).toBe(200);
    expect((await json(res)).restricoes[1].limite_notificacao).toBe(2);
  });
});

describe("cardápio com compatibilidade (RF07)", () => {
  const ver = async (token: string, alunoParam = "") =>
    cardapio.GET(req(`/api/cardapios/${cardapioId}${alunoParam}`, token), ctx(cardapioId));
  const marcas = (corpo: { itens: { nome: string; compatibilidade: { resultado: string } }[] }) =>
    Object.fromEntries(corpo.itens.map((i) => [i.nome.replace(PREFIXO, ""), i.compatibilidade.resultado]));

  it("aluno vê BLOQUEADO (alergia), ATENCAO (intolerância) e COMPATIVEL", async () => {
    const corpo = await json(await ver(tokens.aluno));
    expect(marcas(corpo)).toEqual({ "Pão com amendoim": "BLOQUEADO", Arroz: "COMPATIVEL", Mingau: "ATENCAO" });
    expect(corpo.itens[0].compatibilidade.alertas[0].texto).toBe("ALERGIA DECLARADA: Amendoim. Venda bloqueada.");
    expect(corpo.itens[0].carga_glicemica.rotulo).toBe("estimativa");
  });

  it("responsável vê a mesma compatibilidade do aluno vinculado", async () => {
    const doAluno = marcas(await json(await ver(tokens.aluno)));
    expect(marcas(await json(await ver(tokens.responsavel, `?aluno_id=${alunoId}`)))).toEqual(doAluno);
    expect(marcas(await json(await ver(tokens.responsavel)))).toEqual(doAluno);
  });

  it("operador e coordenação veem o cardápio geral, sem dados de saúde", async () => {
    for (const token of [tokens.operador, tokens.coordenacao]) {
      const corpo = await json(await ver(token));
      expect(corpo.aluno_id).toBeNull();
      expect(corpo.itens.every((i: object) => !("compatibilidade" in i))).toBe(true);
    }
  });

  it("aluno_id de outro aluno ou pedido pelo operador → 403", async () => {
    expect((await ver(tokens.outro, `?aluno_id=${alunoId}`)).status).toBe(403);
    expect((await ver(tokens.operador, `?aluno_id=${alunoId}`)).status).toBe(403);
    expect((await ver(tokens.aluno, "?aluno_id=999999")).status).toBe(403);
  });

  it("PUT mantém o id dos itens que continuam e atualiza o preço", async () => {
    const antes = await json(await ver(tokens.operador));
    const idArroz = antes.itens.find((i: { preparacao_id: number }) => i.preparacao_id === preps.arroz).id;
    const res = await cardapio.PUT(
      req(`/api/cardapios/${cardapioId}`, tokens.operador, { method: "PUT", body: { data: DATA, periodo: "MANHA", itens: [{ preparacao_id: preps.arroz, preco: 5 }] } }),
      ctx(cardapioId),
    );
    expect(res.status).toBe(200);
    const depois = await json(await ver(tokens.operador));
    expect(depois.itens).toMatchObject([{ id: idArroz, preco: 5 }]);
    await cardapio.PUT(
      req(`/api/cardapios/${cardapioId}`, tokens.operador, { method: "PUT", body: { data: DATA, periodo: "MANHA", itens: itensDoCardapio() } }),
      ctx(cardapioId),
    );
  });

  it("revogar o consentimento apaga o perfil; CT19: sem restrições, tudo COMPATIVEL", async () => {
    const res = await perfil.DELETE(req(`/api/alunos/${alunoId}/perfil`, tokens.responsavel, { method: "DELETE" }), ctx(alunoId));
    expect(res.status).toBe(204);
    const p = await json(await perfil.GET(req(`/api/alunos/${alunoId}/perfil`, tokens.responsavel), ctx(alunoId)));
    expect(p).toMatchObject({ consentimento: null, restricoes: [] });
    expect(Object.values(marcas(await json(await ver(tokens.aluno))))).toEqual(["COMPATIVEL", "COMPATIVEL", "COMPATIVEL"]);
  });
});

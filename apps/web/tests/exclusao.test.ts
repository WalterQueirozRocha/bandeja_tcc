import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as alunos from "@/app/api/alunos/route";
import * as cardapios from "@/app/api/cardapios/route";
import * as cardapio from "@/app/api/cardapios/[id]/route";
import * as habilitarCardapio from "@/app/api/cardapios/[id]/habilitar/route";
import * as ingredientes from "@/app/api/ingredientes/route";
import * as ingrediente from "@/app/api/ingredientes/[id]/route";
import * as habilitarIngrediente from "@/app/api/ingredientes/[id]/habilitar/route";
import * as preparacoes from "@/app/api/preparacoes/route";
import * as preparacao from "@/app/api/preparacoes/[id]/route";
import * as habilitarPreparacao from "@/app/api/preparacoes/[id]/habilitar/route";
import * as vendas from "@/app/api/vendas/route";

// B2/B3: o que nunca foi usado é apagado; o que está em uso é desabilitado e pode ser habilitado de novo.
const PREFIXO = "TESTE B2 ";
const DATA = "2095-03-01";
let tokens: Record<"operador" | "aluno", string>;
let alunoId: number;
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
type Rota = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
const del = (rota: { DELETE: Rota }, caminho: string, id: number, token = tokens.operador) =>
  rota.DELETE(req(caminho, token, { method: "DELETE" }), ctx(id));
const habilitar = (rota: { POST: Rota }, caminho: string, id: number, token = tokens.operador) =>
  rota.POST(req(caminho, token, { method: "POST" }), ctx(id));

const novaPreparacao = async (nome: string) =>
  (
    await prisma.preparacao.create({
      data: {
        nome: PREFIXO + nome,
        porcao_g: 100,
        peso_final_calculado: 100,
        itens: { create: [{ ingrediente_id: arrozTaco, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
      },
    })
  ).id;
const publicar = (itens: { preparacao_id: number; preco: number }[], data = DATA) =>
  cardapios.POST(req("/api/cardapios", tokens.operador, { method: "POST", body: { data, periodo: "MANHA", itens } }));

async function limpar() {
  const cards = await prisma.cardapio.findMany({ where: { itens: { some: { preparacao: { nome: { startsWith: PREFIXO } } } } }, select: { id: true } });
  await prisma.venda.deleteMany({ where: { itens: { some: { item_cardapio: { cardapio_id: { in: cards.map((c) => c.id) } } } } } });
  await prisma.cardapio.deleteMany({ where: { id: { in: cards.map((c) => c.id) } } });
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.ingrediente.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.ingrediente.update({ where: { id: arrozTaco }, data: { ativo: true } });
}

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = { operador: await token("operador@gmail.com"), aluno: await token("aluno@gmail.com") };
  alunoId = (await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } })).aluno!.id;
  arrozTaco = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } })).id;
  await limpar();
});

afterAll(async () => {
  await limpar();
  await prisma.$disconnect();
});

describe("preparação", () => {
  it("nunca usada → APAGADO", async () => {
    const id = await novaPreparacao("Solta");
    expect(await json(await del(preparacao, `/api/preparacoes/${id}`, id))).toEqual({ resultado: "APAGADO" });
    expect(await prisma.preparacao.count({ where: { id } })).toBe(0);
  });

  it("em cardápio → DESABILITADO; some da lista, não entra em cardápio novo; habilitar devolve", async () => {
    const id = await novaPreparacao("Usada");
    expect((await publicar([{ preparacao_id: id, preco: 3 }])).status).toBe(201);
    expect((await del(preparacao, `/api/preparacoes/${id}`, id, tokens.aluno)).status).toBe(403);
    expect(await json(await del(preparacao, `/api/preparacoes/${id}`, id))).toEqual({ resultado: "DESABILITADO" });

    const nomes = async (q: string, token = tokens.operador) =>
      (await json(await preparacoes.GET(req(`/api/preparacoes?busca=${PREFIXO}${q}`, token)))).map((p: { nome: string }) => p.nome);
    expect(await nomes("")).not.toContain(`${PREFIXO}Usada`);
    expect(await nomes("&inativos=true")).toContain(`${PREFIXO}Usada`);
    expect(await nomes("&inativos=true", tokens.aluno)).not.toContain(`${PREFIXO}Usada`);
    expect((await publicar([{ preparacao_id: id, preco: 3 }], "2095-03-02")).status).toBe(422);

    expect(await json(await habilitar(habilitarPreparacao, `/api/preparacoes/${id}/habilitar`, id))).toEqual({ id, ativo: true });
    expect(await nomes("")).toContain(`${PREFIXO}Usada`);
  });
});

describe("cardápio", () => {
  let cardapioId: number;
  let itens: number[];

  it("B3: retirar um item vendido o desabilita; ele volta com o mesmo id", async () => {
    const [a, b] = [await novaPreparacao("A"), await novaPreparacao("B")];
    cardapioId = (await json(await publicar([{ preparacao_id: a, preco: 2 }, { preparacao_id: b, preco: 2 }], "2095-03-03"))).id;
    itens = (await prisma.itemCardapio.findMany({ where: { cardapio_id: cardapioId }, orderBy: { id: "asc" } })).map((i) => i.id);
    await vendas.POST(req("/api/vendas", tokens.operador, { method: "POST", body: { aluno_id: alunoId, itens: [{ item_cardapio_id: itens[0] }] } }));

    const editar = (lista: number[]) =>
      cardapio.PUT(
        req(`/api/cardapios/${cardapioId}`, tokens.operador, {
          method: "PUT",
          body: { data: "2095-03-03", periodo: "MANHA", itens: lista.map((preparacao_id) => ({ preparacao_id, preco: 2 })) },
        }),
        ctx(cardapioId),
      );
    expect((await editar([b])).status).toBe(200); // A foi vendido: desabilitado, não apagado
    expect(await prisma.itemCardapio.findUnique({ where: { id: itens[0]! } })).toMatchObject({ ativo: false });
    const visto = await json(await cardapio.GET(req(`/api/cardapios/${cardapioId}`, tokens.operador), ctx(cardapioId)));
    expect(visto.itens.map((i: { id: number }) => i.id)).toEqual([itens[1]]);
    const venda = await vendas.POST(req("/api/vendas", tokens.operador, { method: "POST", body: { aluno_id: alunoId, itens: [{ item_cardapio_id: itens[0] }] } }));
    expect(venda.status).toBe(422);

    expect((await editar([a, b])).status).toBe(200);
    expect(await prisma.itemCardapio.findUnique({ where: { id: itens[0]! } })).toMatchObject({ ativo: true });
  });

  it("com venda → DESABILITADO; some da consulta, libera a data; habilitar com a data ocupada → 422", async () => {
    expect(await json(await del(cardapio, `/api/cardapios/${cardapioId}`, cardapioId))).toEqual({ resultado: "DESABILITADO" });
    const lista = await json(await cardapios.GET(req("/api/cardapios?data=2095-03-03", tokens.operador)));
    expect(lista).toEqual([]);
    const venda = await vendas.POST(req("/api/vendas", tokens.operador, { method: "POST", body: { aluno_id: alunoId, itens: [{ item_cardapio_id: itens[1] }] } }));
    expect(venda.status).toBe(422);

    const outro = await json(await publicar([{ preparacao_id: await novaPreparacao("C"), preco: 1 }], "2095-03-03"));
    expect((await habilitar(habilitarCardapio, `/api/cardapios/${cardapioId}/habilitar`, cardapioId)).status).toBe(422);
    expect(await json(await del(cardapio, `/api/cardapios/${outro.id}`, outro.id))).toEqual({ resultado: "APAGADO" });
    expect((await habilitar(habilitarCardapio, `/api/cardapios/${cardapioId}/habilitar`, cardapioId)).status).toBe(200);
  });
});

describe("ingrediente", () => {
  const rotulo = { nome: `${PREFIXO}Biscoito`, grupo_alimentar: "OUTROS_INDUSTRIALIZADOS", categoria_carboidrato: "AMIDO", carboidrato_g: 70 };

  it("rótulo nunca usado → APAGADO; TACO → só DESABILITADO, mesmo sem uso", async () => {
    const criado = await json(await ingredientes.POST(req("/api/ingredientes", tokens.operador, { method: "POST", body: rotulo })));
    expect(await json(await del(ingrediente, `/api/ingredientes/${criado.id}`, criado.id))).toEqual({ resultado: "APAGADO" });
    const taco = (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 1 } })).id;
    expect(await json(await del(ingrediente, `/api/ingredientes/${taco}`, taco))).toEqual({ resultado: "DESABILITADO" });
    expect((await habilitar(habilitarIngrediente, `/api/ingredientes/${taco}/habilitar`, taco)).status).toBe(200);
  });

  it("desabilitado some da busca e não entra em preparação nova; a que já usa continua", async () => {
    const prep = await novaPreparacao("Com arroz");
    await publicar([{ preparacao_id: prep, preco: 1 }], "2095-03-04");
    expect(await json(await del(ingrediente, `/api/ingredientes/${arrozTaco}`, arrozTaco))).toEqual({ resultado: "DESABILITADO" });

    const busca = await json(await ingredientes.GET(req("/api/ingredientes?busca=Arroz, tipo 1, cru", tokens.operador)));
    expect(busca.itens.map((i: { id: number }) => i.id)).not.toContain(arrozTaco);
    const nova = await preparacoes.POST(
      req("/api/preparacoes", tokens.operador, {
        method: "POST",
        body: { nome: `${PREFIXO}Nova`, porcao_g: 100, itens: [{ ingrediente_id: arrozTaco, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
      }),
    );
    expect(nova.status).toBe(422);
    expect((await json(nova)).erro).toMatch(/desabilitado/);
    const editada = await preparacao.PUT(
      req(`/api/preparacoes/${prep}`, tokens.operador, {
        method: "PUT",
        body: { nome: `${PREFIXO}Com arroz`, porcao_g: 100, itens: [{ ingrediente_id: arrozTaco, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
      }),
      ctx(prep),
    );
    expect(editada.status).toBe(200);
  });
});

describe("aluno no balcão", () => {
  it("aluno desabilitado some da busca", async () => {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" } });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } });
    const lista = await json(await alunos.GET(req("/api/alunos?busca=aluno teste", tokens.operador)));
    await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: true } });
    expect(lista).toEqual([]);
  });
});

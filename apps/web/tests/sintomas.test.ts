import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as registros from "@/app/api/alunos/[id]/sintomas/route";
import * as itens from "@/app/api/alunos/[id]/sintomas/itens/route";
import * as sintomas from "@/app/api/sintomas/route";

const AVISO =
  "Este registro não é um diagnóstico. Se você sentir falta de ar, aperto na garganta, inchaço na boca ou tontura, avise agora um adulto da escola.";
const PREFIXO = "TESTE D3 ";
const DATA_CARDAPIO = new Date("2097-03-01T00:00:00Z");
type Papel = "operador" | "aluno" | "responsavel" | "coordenacao";
let tokens: Record<Papel, string>;
let alunoId: number;
let outroAlunoId: number;
// D3: vendas do aluno de teste (recente concluída, antiga, bloqueada) e de outro aluno.
let compras: Record<"recente" | "antiga" | "bloqueada" | "deOutro", { venda_id: number; item_cardapio_id: number }>;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
// D3: indicar o alimento é obrigatório; por padrão, o de fora da cantina.
const registrar = (body: object, token = tokens.aluno, id = alunoId) =>
  registros.POST(req(`/api/alunos/${id}/sintomas`, token, { method: "POST", body: { alimento_externo: "lanche de casa", ...body } }), ctx(id));
const agora = (deslocamentoMin = 0) => new Date(Date.now() + deslocamentoMin * 60_000).toISOString();
const verItens = (ate: string, token = tokens.aluno, id = alunoId) =>
  itens.GET(req(`/api/alunos/${id}/sintomas/itens?ate=${encodeURIComponent(ate)}`, token), ctx(id));

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = {
    operador: await token("operador@gmail.com"),
    aluno: await token("aluno@gmail.com"),
    responsavel: await token("responsavel@gmail.com"),
    coordenacao: await token("coordenacao@gmail.com"),
  };
  alunoId = (await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } })).aluno!.id;
  await prisma.registroSintoma.deleteMany({ where: { aluno_id: alunoId } });

  const operador = await prisma.usuario.findUniqueOrThrow({ where: { email: "operador@gmail.com" } });
  outroAlunoId = (await prisma.aluno.create({ data: { serie: `${PREFIXO}outro` } })).id;
  const preparacao = await prisma.preparacao.create({ data: { nome: `${PREFIXO}Coxinha`, porcao_g: 100, peso_final_calculado: 100 } });
  const cardapio = await prisma.cardapio.create({
    data: { data: DATA_CARDAPIO, periodo: "TARDE", itens: { create: [{ preparacao_id: preparacao.id, preco: 5 }] } },
    include: { itens: true },
  });
  const item_cardapio_id = cardapio.itens[0]!.id;
  const venda = async (aluno_id: number, horasAtras: number, resultado: "CONCLUIDA" | "BLOQUEADA" = "CONCLUIDA") => {
    const v = await prisma.venda.create({
      data: {
        aluno_id,
        operador_id: operador.id,
        resultado,
        data_hora: new Date(Date.now() - horasAtras * 3_600_000),
        itens: { create: [{ item_cardapio_id, compatibilidade: "COMPATIVEL", preco: 5 }] },
      },
    });
    return { venda_id: v.id, item_cardapio_id };
  };
  compras = { recente: await venda(alunoId, 2), antiga: await venda(alunoId, 30), bloqueada: await venda(alunoId, 1, "BLOQUEADA"), deOutro: await venda(outroAlunoId, 1) };
});

afterAll(async () => {
  await prisma.registroSintoma.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.venda.deleteMany({ where: { id: { in: Object.values(compras).map((c) => c.venda_id) } } });
  await prisma.cardapio.deleteMany({ where: { data: DATA_CARDAPIO } });
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.aluno.delete({ where: { id: outroAlunoId } });
  await prisma.$disconnect();
});

describe("GET /api/sintomas (Quadro 8, RF13)", () => {
  it("traz o aviso fixo e os 15 sintomas nos 5 grupos", async () => {
    const corpo = await json(await sintomas.GET(req("/api/sintomas", tokens.aluno)));
    expect(corpo.aviso).toBe(AVISO);
    expect(corpo.grupos.map((g: { grupo: string }) => g.grupo)).toEqual(["PELE", "BOCA_GARGANTA", "BARRIGA", "RESPIRACAO", "OUTROS"]);
    expect(corpo.grupos.flatMap((g: { sintomas: unknown[] }) => g.sintomas)).toHaveLength(15);
  });

  it("sem login → 401", async () => {
    expect((await sintomas.GET(req("/api/sintomas"))).status).toBe(401);
  });
});

describe("CT20: registro de sintoma", () => {
  it('aluno registra "dor ou cólica" com data e hora; nada é calculado, alertado ou notificado', async () => {
    const contar = () =>
      Promise.all([prisma.notificacao.count(), prisma.venda.count(), prisma.restricaoDeclarada.count(), prisma.solicitacaoBloqueio.count()]);
    const antes = await contar();

    const data_hora = agora(-30);
    const res = await registrar({ sintoma_codigo: "DOR_COLICA", data_hora });
    expect(res.status).toBe(201);
    expect(await json(res)).toMatchObject({ sintoma_codigo: "DOR_COLICA", observacao: null, data_hora, alimento_externo: "lanche de casa" });

    expect(await contar()).toEqual(antes);
    const lista = await json(await registros.GET(req(`/api/alunos/${alunoId}/sintomas`, tokens.aluno), ctx(alunoId)));
    expect(lista[0]).toMatchObject({ sintoma: { codigo: "DOR_COLICA", descricao: "Dor ou cólica", grupo: "BARRIGA" }, alimento_externo: "lanche de casa", itens_cantina: [] });
  });
});

describe("D3: alimento consumido antes do sintoma", () => {
  it("indicar o alimento é obrigatório", async () => {
    const res = await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), alimento_externo: undefined });
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/Indique o que comeu/);
  });

  it("a lista oferece só as compras concluídas do próprio aluno nas 24 h anteriores", async () => {
    const lista = await json(await verItens(agora()));
    expect(lista).toEqual([expect.objectContaining({ ...compras.recente, nome: `${PREFIXO}Coxinha` })]);
  });

  it("item comprado na janela é aceito e aparece no diário com o nome da preparação", async () => {
    const res = await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), itens: [compras.recente], alimento_externo: undefined });
    expect(res.status).toBe(201);
    const lista = await json(await registros.GET(req(`/api/alunos/${alunoId}/sintomas`, tokens.aluno), ctx(alunoId)));
    expect(lista[0]).toMatchObject({ itens_cantina: [`${PREFIXO}Coxinha`], alimento_externo: null });
  });

  it.each([
    ["fora da janela de 24 h", () => compras.antiga],
    ["de venda bloqueada", () => compras.bloqueada],
    ["de outro aluno", () => compras.deOutro],
  ])("item %s → 422", async (_, item) => {
    const res = await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), itens: [item()] });
    expect(res.status).toBe(422);
    expect((await json(res)).erro).toMatch(/24 h antes do sintoma/);
  });

  it("item repetido → 400", async () => {
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), itens: [compras.recente, compras.recente] })).status).toBe(400);
  });

  it("alimento de fora acima de 100 caracteres → 400", async () => {
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), alimento_externo: "x".repeat(101) })).status).toBe(400);
  });

  it("só o próprio aluno consulta os itens; sem `ate` → 400", async () => {
    expect((await verItens(agora(), tokens.responsavel)).status).toBe(403);
    expect((await verItens(agora(), tokens.aluno, outroAlunoId)).status).toBe(403);
    expect((await itens.GET(req(`/api/alunos/${alunoId}/sintomas/itens`, tokens.aluno), ctx(alunoId))).status).toBe(400);
  });
});

describe("acesso (Quadro 9)", () => {
  it("responsável, operador e coordenação não veem nem registram → 403", async () => {
    for (const token of [tokens.responsavel, tokens.operador, tokens.coordenacao]) {
      expect((await registros.GET(req(`/api/alunos/${alunoId}/sintomas`, token), ctx(alunoId))).status).toBe(403);
      expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora() }, token)).status).toBe(403);
    }
  });

  it("aluno não acessa registros de outro aluno → 403", async () => {
    expect((await registros.GET(req("/api/alunos/999999/sintomas", tokens.aluno), ctx(999999))).status).toBe(403);
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora() }, tokens.aluno, 999999)).status).toBe(403);
  });
});

describe("validações", () => {
  it('"Outro" aceita texto curto opcional (doc v3); os demais não aceitam texto', async () => {
    expect((await registrar({ sintoma_codigo: "OUTRO", data_hora: agora() })).status).toBe(201);
    expect((await registrar({ sintoma_codigo: "OUTRO", data_hora: agora(), observacao: "dor de cabeça" })).status).toBe(201);
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(), observacao: "x" })).status).toBe(422);
    expect((await registrar({ sintoma_codigo: "OUTRO", data_hora: agora(), observacao: "x".repeat(101) })).status).toBe(400);
  });

  it("data/hora no futuro → 422 (com 5 min de tolerância)", async () => {
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(60) })).status).toBe(422);
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: agora(2) })).status).toBe(201);
  });

  it("data/hora sem fuso → 400; sintoma inexistente → 422", async () => {
    expect((await registrar({ sintoma_codigo: "ENJOO", data_hora: "2026-10-23T10:00:00" })).status).toBe(400);
    expect((await registrar({ sintoma_codigo: "XYZ", data_hora: agora() })).status).toBe(422);
  });
});

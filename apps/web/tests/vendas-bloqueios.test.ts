import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, type TipoNotificacao } from "@bandeja/dados";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as alunos from "@/app/api/alunos/route";
import * as historico from "@/app/api/alunos/[id]/historico/route";
import * as bloqueios from "@/app/api/bloqueios/route";
import * as bloqueio from "@/app/api/bloqueios/[id]/route";
import * as cardapio from "@/app/api/cardapios/[id]/route";
import * as vendas from "@/app/api/vendas/route";

const PREFIXO = "TESTE I4 ";
const DATAS = ["2097-01-01", "2097-01-02"].map((d) => new Date(`${d}T00:00:00Z`));
type Papel = "operador" | "aluno" | "responsavel" | "coordenacao";
let tokens: Record<Papel, string>;
let alunoId: number;
let ids: { operador: number; responsavel: number };
// D2: notificações deste arquivo (do aluno de teste ou das preparações com o prefixo), de um tipo e destinatário.
const notificacoes = (destinatario_id: number, tipo: TipoNotificacao) =>
  prisma.notificacao.findMany({
    where: { destinatario_id, tipo, OR: [{ aluno_id: alunoId }, { mensagem: { contains: PREFIXO } }] },
    orderBy: { id: "asc" },
  });
let item: Record<"pacoca" | "pao" | "mingau" | "arroz", number>;
let prepArroz: number;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const vender = (itens: (number | { item_cardapio_id: number; quantidade: number })[], decisao?: "CONCLUIR" | "ENCERRAR", token = tokens.operador) =>
  vendas.POST(
    req("/api/vendas", token, {
      method: "POST",
      body: { aluno_id: alunoId, itens: itens.map((i) => (typeof i === "number" ? { item_cardapio_id: i } : i)), decisao },
    }),
  );

async function criarPreparacao(nome: string, cozinha: string[]) {
  const arroz = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } });
  return (
    await prisma.preparacao.create({
      data: {
        nome: PREFIXO + nome,
        porcao_g: 100,
        peso_final_calculado: 100,
        itens: { create: [{ ingrediente_id: arroz.id, quantidade_crua_g: 100, modo_preparo: "CRU" }] },
        marcadores_cozinha: { create: cozinha.map((categoria_codigo) => ({ categoria_codigo, presenca: "PODE_CONTER" as const, motivo: "teste" })) },
      },
    })
  ).id;
}

async function limparVendas() {
  await prisma.venda.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.notificacao.deleteMany({ where: { aluno_id: alunoId } });
}

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = {
    operador: await token("operador@gmail.com"),
    aluno: await token("aluno@gmail.com"),
    responsavel: await token("responsavel@gmail.com"),
    coordenacao: await token("coordenacao@gmail.com"),
  };
  const usuarioAluno = await prisma.usuario.findUniqueOrThrow({ where: { email: "aluno@gmail.com" }, include: { aluno: true } });
  const responsavel = await prisma.usuario.findUniqueOrThrow({ where: { email: "responsavel@gmail.com" } });
  alunoId = usuarioAluno.aluno!.id;
  ids = { operador: (await prisma.usuario.findUniqueOrThrow({ where: { email: "operador@gmail.com" } })).id, responsavel: responsavel.id };
  await limparVendas();

  const preps = {
    pacoca: await criarPreparacao("Paçoca", ["AMENDOIM"]),
    pao: await criarPreparacao("Pão", ["GLUTEN"]),
    mingau: await criarPreparacao("Mingau", ["LACTOSE"]),
    arroz: await criarPreparacao("Arroz", []),
  };
  prepArroz = preps.arroz;
  const c = await prisma.cardapio.create({
    data: { data: DATAS[0]!, periodo: "MANHA", itens: { create: Object.values(preps).map((preparacao_id) => ({ preparacao_id, preco: 5 })) } },
    include: { itens: true },
  });
  const idDe = (prep: number) => c.itens.find((i) => i.preparacao_id === prep)!.id;
  item = { pacoca: idDe(preps.pacoca), pao: idDe(preps.pao), mingau: idDe(preps.mingau), arroz: idDe(preps.arroz) };

  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({
    where: { id: alunoId },
    data: {
      consentimento_por: responsavel.id,
      consentimento_em: new Date(),
      restricoes: {
        create: [
          { categoria_codigo: "AMENDOIM", tipo: "ALERGIA", declarada_por: responsavel.id },
          { categoria_codigo: "GLUTEN", tipo: "DOENCA_CELIACA", declarada_por: responsavel.id },
          { categoria_codigo: "LACTOSE", tipo: "INTOLERANCIA", limite_notificacao: 2, declarada_por: responsavel.id },
        ],
      },
    },
  });
});

afterAll(async () => {
  await limparVendas();
  await prisma.notificacao.deleteMany({ where: { mensagem: { contains: PREFIXO } } });
  await prisma.solicitacaoBloqueio.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.cardapio.deleteMany({ where: { data: { in: DATAS } } });
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.restricaoDeclarada.deleteMany({ where: { aluno_id: alunoId } });
  await prisma.aluno.update({ where: { id: alunoId }, data: { consentimento_por: null, consentimento_em: null } });
  await prisma.$disconnect();
});

describe("POST /api/vendas (RF08–RF10)", () => {
  it("só o operador registra; aluno e item inexistentes são recusados", async () => {
    expect((await vender([item.arroz], undefined, tokens.aluno)).status).toBe(403);
    const semAluno = await vendas.POST(req("/api/vendas", tokens.operador, { method: "POST", body: { aluno_id: 999999, itens: [{ item_cardapio_id: item.arroz }] } }));
    expect(semAluno.status).toBe(404);
    expect((await vender([999999])).status).toBe(422);
  });

  it("CT14: alergia a amendoim; item pode conter amendoim → BLOQUEADA com alerta de alergia", async () => {
    const res = await vender([item.pacoca]);
    expect(res.status).toBe(201);
    const corpo = await json(res);
    expect(corpo.resultado).toBe("BLOQUEADA");
    expect(corpo.itens[0].alertas).toEqual(["ALERGIA DECLARADA: Amendoim. Venda bloqueada."]);
    expect(JSON.stringify(corpo)).not.toMatch(/restric|tipo/i); // operador vê só o alerta (RNF04)
    expect((await prisma.venda.findUniqueOrThrow({ where: { id: corpo.venda_id } })).resultado).toBe("BLOQUEADA");
  });

  it("CT15: doença celíaca; item pode conter glúten → BLOQUEADA com alerta de doença celíaca", async () => {
    const corpo = await json(await vender([item.pao]));
    expect(corpo.resultado).toBe("BLOQUEADA");
    expect(corpo.itens[0].alertas).toEqual(["DOENÇA CELÍACA DECLARADA: glúten. Venda bloqueada."]);
  });

  it("P7: um item bloqueado bloqueia a venda inteira, mesmo com CONCLUIR", async () => {
    const corpo = await json(await vender([item.arroz, item.pacoca], "CONCLUIR"));
    expect(corpo.resultado).toBe("BLOQUEADA");
    expect(corpo.itens.map((i: { compatibilidade: string }) => i.compatibilidade)).toEqual(["COMPATIVEL", "BLOQUEADO"]);
  });

  it("item compatível → CONCLUIDA", async () => {
    expect((await json(await vender([item.arroz]))).resultado).toBe("CONCLUIDA");
  });
});

describe("atenção, contagem e notificação (RF09, RF11)", () => {
  it("ATENÇÃO sem decisão → pede confirmação e não grava nada", async () => {
    await limparVendas();
    const res = await vender([item.mingau]);
    expect(res.status).toBe(200);
    const corpo = await json(res);
    expect(corpo.resultado).toBe("CONFIRMACAO_NECESSARIA");
    expect(corpo.itens[0].alertas).toEqual(["RESTRIÇÃO DECLARADA: Lactose. Confirme com o aluno."]);
    expect(await prisma.venda.count({ where: { aluno_id: alunoId } })).toBe(0);
  });

  it("CT18: operador encerra → CANCELADA_PELO_OPERADOR, sem contagem", async () => {
    const corpo = await json(await vender([item.mingau], "ENCERRAR"));
    expect(corpo.resultado).toBe("CANCELADA_PELO_OPERADOR");
    expect(corpo.contagem).toEqual([]);
  });

  it("CT16: intolerância; operador conclui → CONCLUIDA e contagem +1", async () => {
    const corpo = await json(await vender([item.mingau], "CONCLUIR"));
    expect(corpo.resultado).toBe("CONCLUIDA");
    expect(corpo.contagem).toEqual([{ categoria: "LACTOSE", consumos: 1, limite: 2, notificados: 0 }]);
  });

  it("CT17: limite 2; 2ª, 3ª e 4ª vendas → notificação na plataforma só na 3ª (D2)", async () => {
    const notificados = [];
    for (let i = 0; i < 3; i++) notificados.push((await json(await vender([item.mingau], "CONCLUIR"))).contagem[0].notificados);
    expect(notificados).toEqual([0, 1, 0]);
    expect(await notificacoes(ids.responsavel, "LIMITE_SEMANAL")).toEqual([
      expect.objectContaining({
        aluno_id: alunoId,
        categoria_codigo: "LACTOSE",
        mensagem: "Aluno Teste consumiu 3 itens com Lactose nesta semana. Limite definido: 2.",
        link: "/historico",
        lida_em: null,
      }),
    ]);
  });

  it("quantidade: total = preço × quantidade; cada unidade conta na semana e no histórico", async () => {
    await limparVendas();
    expect((await vender([{ item_cardapio_id: item.mingau, quantidade: 21 }], "CONCLUIR")).status).toBe(400);
    expect((await vender([item.mingau, item.mingau], "CONCLUIR")).status).toBe(400);
    const corpo = await json(await vender([{ item_cardapio_id: item.mingau, quantidade: 2 }, item.arroz], "CONCLUIR"));
    expect(corpo).toMatchObject({ resultado: "CONCLUIDA", total: 15, itens: [{ quantidade: 2 }, { quantidade: 1 }] });
    expect(corpo.contagem).toEqual([{ categoria: "LACTOSE", consumos: 2, limite: 2, notificados: 0 }]);
    const [refeicao] = await json(await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.aluno), ctx(alunoId)));
    const unidade = await prisma.itemVenda.findFirstOrThrow({ where: { venda_id: corpo.venda_id, item_cardapio_id: item.mingau } });
    const mingau = refeicao.itens.find((i: { quantidade: number }) => i.quantidade === 2);
    expect(refeicao.total).toBe(15);
    expect(mingau.cg).toBeCloseTo(unidade.cg! * 2);
    expect(mingau.carboidrato_disponivel_g).toBeCloseTo(unidade.carboidrato_disponivel_g! * 2);
    await limparVendas();
  });

  it("vendas simultâneas acima do limite não duplicam a notificação", async () => {
    await limparVendas();
    await vender([item.mingau], "CONCLUIR");
    await vender([item.mingau], "CONCLUIR");
    await Promise.all([vender([item.mingau], "CONCLUIR"), vender([item.mingau], "CONCLUIR")]);
    expect(await notificacoes(ids.responsavel, "LIMITE_SEMANAL")).toHaveLength(1);
  });

  it("B4: a venda guarda os valores do momento; editar a preparação ou o preço não muda o passado", async () => {
    await limparVendas();
    const mingau = await prisma.itemCardapio.findUniqueOrThrow({ where: { id: item.mingau } });
    const leite = await prisma.itemCardapio.create({
      data: { cardapio_id: mingau.cardapio_id, preparacao_id: await criarPreparacao("Leite", ["LACTOSE"]), preco: 4 },
    });
    await vender([item.mingau], "CONCLUIR");

    // Depois da venda: o mingau deixa de ter lactose e muda de preço.
    await prisma.marcadorPreparacao.deleteMany({ where: { preparacao_id: mingau.preparacao_id } });
    await prisma.itemCardapio.update({ where: { id: item.mingau }, data: { preco: 9 } });
    const gravado = await prisma.itemVenda.findFirstOrThrow({ where: { item_cardapio_id: item.mingau, venda: { aluno_id: alunoId } } });
    expect(gravado).toMatchObject({ categorias_atencao: ["LACTOSE"], cg: expect.any(Number) });
    expect(Number(gravado.preco)).toBe(5);

    // A contagem usa o que foi gravado: o mingau continua contando lactose.
    expect((await json(await vender([leite.id], "CONCLUIR"))).contagem[0].consumos).toBe(2);
    const lista = await json(await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.aluno), ctx(alunoId)));
    expect(lista.at(-1).itens[0].preco).toBe(5);

    await prisma.marcadorPreparacao.create({ data: { preparacao_id: mingau.preparacao_id, categoria_codigo: "LACTOSE", presenca: "PODE_CONTER", motivo: "teste" } });
    await prisma.itemCardapio.update({ where: { id: item.mingau }, data: { preco: 5 } });
    await limparVendas();
    await prisma.itemCardapio.delete({ where: { id: leite.id } });
  });
});

describe("histórico de consumo (D7, P15)", () => {
  it("aluno vê só as vendas concluídas, com a CG da refeição", async () => {
    await vender([item.arroz, item.mingau], "CONCLUIR");
    const lista = await json(await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.aluno), ctx(alunoId)));
    expect(lista.length).toBe(await prisma.venda.count({ where: { aluno_id: alunoId, resultado: "CONCLUIDA" } }));
    const refeicao = lista[0];
    expect(refeicao.itens).toHaveLength(2);
    expect(refeicao.rotulo).toBe("estimativa");
    expect(refeicao.cg_refeicao).toBeCloseTo(refeicao.itens[0].cg + refeicao.itens[1].cg);
  });

  it("FC-01: CG da refeição também pela FAO, só quando todos os itens têm IG pareado", async () => {
    const ultima = async () => (await json(await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.aluno), ctx(alunoId))))[0];
    const arroz = await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco: 4 } });
    // O IG real do arroz (valores-ig.csv) sai durante o teste e volta no fim.
    const igReal = await prisma.valorIG.findUnique({ where: { ingrediente_id: arroz.id } });
    await prisma.valorIG.deleteMany({ where: { ingrediente_id: arroz.id } });
    try {
      await vender([item.arroz, item.mingau], "CONCLUIR");
      expect(await ultima()).toMatchObject({ cg_refeicao_fao: null, itens: [{ cg_fao: null }, { cg_fao: null }] });

      await prisma.valorIG.create({ data: { ingrediente_id: arroz.id, ig: 70, item_correspondente: "teste", lista: "LISTA_1", justificativa: "FC-01" } });
      await vender([item.arroz, item.mingau], "CONCLUIR");
      const refeicao = await ultima();
      expect(refeicao.itens.every((i: { cg_fao: unknown }) => typeof i.cg_fao === "number")).toBe(true);
      expect(refeicao.cg_refeicao_fao).toBeCloseTo(refeicao.itens[0].cg_fao + refeicao.itens[1].cg_fao);
    } finally {
      await prisma.valorIG.deleteMany({ where: { ingrediente_id: arroz.id } });
      if (igReal) await prisma.valorIG.create({ data: igReal });
    }
  });

  it("responsável vinculado vê; operador e coordenação → 403", async () => {
    expect((await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.responsavel), ctx(alunoId))).status).toBe(200);
    expect((await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.operador), ctx(alunoId))).status).toBe(403);
    expect((await historico.GET(req(`/api/alunos/${alunoId}/historico`, tokens.coordenacao), ctx(alunoId))).status).toBe(403);
  });
});

describe("bloqueios (RF14, P6)", () => {
  let bloqueioId: number;

  it("responsável solicita; pedido repetido → 422", async () => {
    const res = await bloqueios.POST(req("/api/bloqueios", tokens.responsavel, { method: "POST", body: { aluno_id: alunoId, preparacao_id: prepArroz } }));
    expect(res.status).toBe(201);
    bloqueioId = (await json(res)).id;
    const repetido = await bloqueios.POST(req("/api/bloqueios", tokens.responsavel, { method: "POST", body: { aluno_id: alunoId, preparacao_id: prepArroz } }));
    expect(repetido.status).toBe(422);
  });

  it("D2: o operador é notificado do pedido, sem dado de saúde (RNF04)", async () => {
    const [n] = await notificacoes(ids.operador, "BLOQUEIO_SOLICITADO");
    expect(n).toMatchObject({ mensagem: `Novo bloqueio solicitado: ${PREFIXO}Arroz para Aluno Teste.`, link: "/bloqueios", aluno_id: null });
    expect(n!.mensagem).not.toMatch(/alergia|intoler|lactose|amendoim|celíaca/i);
  });

  it("enquanto SOLICITADA, a venda continua liberada", async () => {
    expect((await json(await vender([item.arroz]))).resultado).toBe("CONCLUIDA");
  });

  it("aluno e coordenação não acessam; operador vê todos; responsável, os seus", async () => {
    expect((await bloqueios.GET(req("/api/bloqueios", tokens.aluno))).status).toBe(403);
    expect((await bloqueios.GET(req("/api/bloqueios", tokens.coordenacao))).status).toBe(403);
    const doOperador = await json(await bloqueios.GET(req("/api/bloqueios?situacao=SOLICITADA", tokens.operador)));
    expect(doOperador.map((b: { id: number }) => b.id)).toContain(bloqueioId);
    expect((await json(await bloqueios.GET(req("/api/bloqueios", tokens.responsavel))))[0].preparacao.nome).toBe(`${PREFIXO}Arroz`);
  });

  it("operador executa → a venda fica BLOQUEADA com o texto do bloqueio", async () => {
    const res = await bloqueio.PUT(req(`/api/bloqueios/${bloqueioId}`, tokens.operador, { method: "PUT", body: { situacao: "EXECUTADA" } }), ctx(bloqueioId));
    expect((await json(res)).situacao).toBe("EXECUTADA");
    const corpo = await json(await vender([item.arroz]));
    expect(corpo.resultado).toBe("BLOQUEADA");
    expect(corpo.itens[0].alertas).toEqual([`BLOQUEIO SOLICITADO PELO RESPONSÁVEL: ${PREFIXO}Arroz. Venda bloqueada.`]);
    // D2: o responsável que pediu é notificado da execução.
    expect(await notificacoes(ids.responsavel, "BLOQUEIO_EXECUTADO")).toEqual([
      expect.objectContaining({ mensagem: `O bloqueio de ${PREFIXO}Arroz para Aluno Teste foi executado.` }),
    ]);
  });

  it("CT25: item compatível + item com bloqueio executado → venda inteira BLOQUEADA", async () => {
    const { cardapio_id } = await prisma.itemCardapio.findUniqueOrThrow({ where: { id: item.arroz } });
    const suco = await prisma.itemCardapio.create({ data: { cardapio_id, preparacao_id: await criarPreparacao("Suco", []), preco: 3 } });
    const corpo = await json(await vender([suco.id, item.arroz], "CONCLUIR"));
    expect(corpo.resultado).toBe("BLOQUEADA");
    const porItem = Object.fromEntries(corpo.itens.map((i: { item_cardapio_id: number; compatibilidade: string }) => [i.item_cardapio_id, i]));
    expect(porItem[suco.id].compatibilidade).toBe("COMPATIVEL");
    expect(porItem[item.arroz]).toMatchObject({
      compatibilidade: "BLOQUEADO",
      alertas: [`BLOQUEIO SOLICITADO PELO RESPONSÁVEL: ${PREFIXO}Arroz. Venda bloqueada.`],
    });
  });

  it("executar de novo → 422; responsável não decide → 403", async () => {
    const put = (token: string) =>
      bloqueio.PUT(req(`/api/bloqueios/${bloqueioId}`, token, { method: "PUT", body: { situacao: "RECUSADA" } }), ctx(bloqueioId));
    expect((await put(tokens.operador)).status).toBe(422);
    expect((await put(tokens.responsavel)).status).toBe(403);
  });

  it("responsável cancela → a venda volta a ser liberada e o operador é notificado (D2)", async () => {
    const res = await bloqueio.DELETE(req(`/api/bloqueios/${bloqueioId}`, tokens.responsavel, { method: "DELETE" }), ctx(bloqueioId));
    expect(res.status).toBe(204);
    expect((await json(await vender([item.arroz]))).resultado).toBe("CONCLUIDA");
    expect(await notificacoes(ids.operador, "BLOQUEIO_CANCELADO")).toEqual([
      expect.objectContaining({ mensagem: `O bloqueio de ${PREFIXO}Arroz para Aluno Teste foi cancelado.` }),
    ]);
  });
});

describe("GET /api/alunos (identificação no balcão)", () => {
  it("operador busca e recebe só id, nome e série; aluno → 403", async () => {
    const lista = await json(await alunos.GET(req("/api/alunos?busca=aluno teste", tokens.operador)));
    expect(lista).toEqual([{ id: alunoId, nome: "Aluno Teste", serie: "9º ano" }]);
    expect((await alunos.GET(req("/api/alunos", tokens.aluno))).status).toBe(403);
  });
});

describe("CT22: desempenho com 50 itens", () => {
  it("compatibilidade do cardápio e venda com 50 itens em até 2 s cada", async () => {
    const preps = [];
    for (let i = 0; i < 50; i++) preps.push(await criarPreparacao(`Lanche ${i}`, i % 2 ? ["LEITE"] : []));
    const c = await prisma.cardapio.create({
      data: { data: DATAS[1]!, periodo: "MANHA", itens: { create: preps.map((preparacao_id) => ({ preparacao_id, preco: 3 })) } },
      include: { itens: true },
    });

    let inicio = performance.now();
    const res = await cardapio.GET(req(`/api/cardapios/${c.id}`, tokens.aluno), ctx(c.id));
    const tempoCardapio = performance.now() - inicio;
    expect((await json(res)).itens).toHaveLength(50);

    inicio = performance.now();
    const venda = await vender(c.itens.map((i) => i.id), "CONCLUIR");
    const tempoVenda = performance.now() - inicio;
    expect(venda.status).toBe(201);

    expect(tempoCardapio).toBeLessThan(2000);
    expect(tempoVenda).toBeLessThan(2000);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@bandeja/dados";
import { importarFatores, importarFormas, importarIg, importarTaco } from "@bandeja/dados/src/importadores";
import { SENHA_TESTE } from "@bandeja/dados/src/seed";
import * as login from "@/app/api/auth/login/route";
import * as fatores from "@/app/api/fatores/route";
import * as fator from "@/app/api/fatores/[id]/route";
import * as ingredientes from "@/app/api/ingredientes/route";
import * as ingrediente from "@/app/api/ingredientes/[id]/route";
import * as ig from "@/app/api/ingredientes/[id]/ig/route";
import * as formaCrua from "@/app/api/ingredientes/[id]/forma-crua/route";
import * as preparacoes from "@/app/api/preparacoes/route";

// M1–M4: criação manual do que também entra por planilha; os importadores mesclam.
const REFERENCIA = "TESTE M1";
const PREFIXO = "TESTE M ";
let tokens: Record<"operador" | "aluno", string>;
const taco: Record<"abobora" | "berinjelaCrua" | "berinjelaCozida" | "arroz", number> = {} as never;

function req(caminho: string, token?: string, init: { method?: string; body?: unknown } = {}) {
  return new Request(`http://teste${caminho}`, {
    method: init.method ?? "GET",
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
  });
}
const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response) => r.json();
const porCodigo = async (codigo_taco: number) => (await prisma.ingrediente.findUniqueOrThrow({ where: { codigo_taco } })).id;

beforeAll(async () => {
  const token = async (email: string) =>
    (await json(await login.POST(req("/api/auth/login", undefined, { method: "POST", body: { email, senha: SENHA_TESTE } })))).token;
  tokens = { operador: await token("operador@gmail.com"), aluno: await token("aluno@gmail.com") };
  Object.assign(taco, { abobora: await porCodigo(67), berinjelaCrua: await porCodigo(96), berinjelaCozida: await porCodigo(95), arroz: await porCodigo(4) });
});

afterAll(async () => {
  await prisma.preparacao.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.fatorPreparo.deleteMany({ where: { referencia: REFERENCIA } });
  await prisma.valorIG.deleteMany({ where: { ingrediente_id: taco.arroz } });
  await prisma.ingrediente.deleteMany({ where: { nome: { startsWith: PREFIXO } } });
  await prisma.ingrediente.update({ where: { id: taco.berinjelaCozida }, data: { forma_crua_id: taco.berinjelaCrua, modo_preparo: "COZIDO" } });
  await prisma.$disconnect();
});

describe("M1: fatores de cocção", () => {
  let id: number;
  const corpo = { grupo_alimentar: "VERDURAS_HORTALICAS", modo_preparo: "ASSADO", fator_coccao: 0.8, referencia: REFERENCIA };
  const criar = (body: unknown, token = tokens.operador) => fatores.POST(req("/api/fatores", token, { method: "POST", body }));
  const editar = (body: unknown) => fator.PUT(req(`/api/fatores/${id}`, tokens.operador, { method: "PUT", body }), ctx(id));

  it("operador cria; repetido → 422; CRU → 400; aluno → 403", async () => {
    expect((await criar(corpo, tokens.aluno)).status).toBe(403);
    expect((await criar({ ...corpo, modo_preparo: "CRU" })).status).toBe(400);
    const r = await criar(corpo);
    expect(r.status).toBe(201);
    id = (await json(r)).id;
    expect((await criar(corpo)).status).toBe(422);
    const detalhe = await json(await ingrediente.GET(req("/x", tokens.operador), ctx(taco.abobora)));
    expect(detalhe.modos_disponiveis).toContain("ASSADO");
  });

  it("reimportar a planilha mantém o fator manual", async () => {
    await importarFatores();
    expect(await prisma.fatorPreparo.count({ where: { id } })).toBe(1);
  });

  it("em uso: não remove nem troca a chave; trocar o valor pode", async () => {
    const prep = await preparacoes.POST(
      req("/api/preparacoes", tokens.operador, {
        method: "POST",
        body: { nome: `${PREFIXO}Abóbora moranga assada`, porcao_g: 80, itens: [{ ingrediente_id: taco.abobora, quantidade_crua_g: 100, modo_preparo: "ASSADO" }] },
      }),
    );
    expect(prep.status).toBe(201);
    const prepId = (await json(prep)).id;
    expect((await fator.DELETE(req("/x", tokens.operador, { method: "DELETE" }), ctx(id))).status).toBe(422);
    expect((await editar({ ...corpo, modo_preparo: "GRELHADO" })).status).toBe(422);
    expect((await json(await editar({ ...corpo, fator_coccao: 0.75 }))).fator_coccao).toBe(0.75);
    // FC-08: o peso final gravado acompanha o novo fator (100 g cru × 0,75).
    expect((await prisma.preparacao.findUniqueOrThrow({ where: { id: prepId } })).peso_final_calculado).toBe(75);
  });
});

describe("FC-11 e FC-12: o que a preparação usa não muda por baixo dela", () => {
  const ficha = (nome: string, ingrediente_id: number, modo_preparo: string) =>
    preparacoes.POST(
      req("/api/preparacoes", tokens.operador, {
        method: "POST",
        body: { nome: `${PREFIXO}${nome}`, porcao_g: 50, itens: [{ ingrediente_id, quantidade_crua_g: 100, modo_preparo }] },
      }),
    );

  it("FC-11: não troca o grupo de ingrediente usado em modo cozido; usado só no cru, troca", async () => {
    const criar = async (nome: string) =>
      (
        await json(
          await ingredientes.POST(
            req("/api/ingredientes", tokens.operador, {
              method: "POST",
              body: { nome: `${PREFIXO}${nome}`, grupo_alimentar: "VERDURAS_HORTALICAS", categoria_carboidrato: "AMIDO", carboidrato_g: 10 },
            }),
          ),
        )
      ).id;
    const [assada, crua] = [await criar("Abóbora"), await criar("Pepino")];
    expect((await ficha("Abóbora assada", assada, "ASSADO")).status).toBe(201);
    expect((await ficha("Pepino cru", crua, "CRU")).status).toBe(201);
    const mudarGrupo = (id: number) => ingrediente.PUT(req("/x", tokens.operador, { method: "PUT", body: { grupo_alimentar: "FRUTAS", motivo: "teste" } }), ctx(id));
    expect((await mudarGrupo(assada)).status).toBe(422);
    expect((await mudarGrupo(crua)).status).toBe(200);
  });

  it("FC-12: não desliga nem troca a forma frita usada por preparação em FRITO", async () => {
    const [batataCrua, batataFrita] = [await porCodigo(92), await porCodigo(93)];
    const { grupo_alimentar } = await prisma.ingrediente.findUniqueOrThrow({ where: { id: batataCrua } });
    const novoFator = { grupo_alimentar, modo_preparo: "FRITO", fator_coccao: 0.6, referencia: REFERENCIA };
    expect((await fatores.POST(req("/api/fatores", tokens.operador, { method: "POST", body: novoFator }))).status).toBe(201);
    expect((await ficha("Batata frita", batataCrua, "FRITO")).status).toBe(201);
    expect((await formaCrua.DELETE(req("/x", tokens.operador, { method: "DELETE" }), ctx(batataFrita))).status).toBe(422);
    const religar = { forma_crua_id: batataCrua, modo_preparo: "ASSADO" };
    expect((await formaCrua.PUT(req("/x", tokens.operador, { method: "PUT", body: religar }), ctx(batataFrita))).status).toBe(422);
  });
});

describe("M2: valor de IG", () => {
  const corpo = { ig: 98, escala: "PAO", lista: "LISTA_1", item_correspondente: "Rice, white", justificativa: "teste", conferido_por_1: "Ana", conferido_por_2: "Bruno" };
  const gravar = (body: unknown) => ig.PUT(req("/x", tokens.operador, { method: "PUT", body }), ctx(taco.arroz));

  it("grava convertendo a escala do pão; mesma pessoa conferindo → 400", async () => {
    expect((await gravar({ ...corpo, conferido_por_2: "ana" })).status).toBe(400);
    expect((await json(await gravar(corpo))).ig).toBeCloseTo(70);
    await importarIg();
    expect(await prisma.valorIG.count({ where: { ingrediente_id: taco.arroz } })).toBe(1);
  });

  it("IG 0 só na lista ESTIMADO (passo 6 de Louie et al., 2015)", async () => {
    expect((await gravar({ ...corpo, ig: 0 })).status).toBe(400);
    const estimado = await json(await gravar({ ...corpo, ig: 0, escala: "GLICOSE", lista: "ESTIMADO" }));
    expect(estimado).toMatchObject({ ig: 0, lista: "ESTIMADO" });
  });

  it("remove; remover de novo → 404", async () => {
    const remover = () => ig.DELETE(req("/x", tokens.operador, { method: "DELETE" }), ctx(taco.arroz));
    expect((await remover()).status).toBe(204);
    expect((await remover()).status).toBe(404);
  });
});

describe("M3: forma preparada ↔ crua", () => {
  const ligar = (id: number, body: unknown) => formaCrua.PUT(req("/x", tokens.operador, { method: "PUT", body }), ctx(id));

  it("desliga e liga de novo; regras da TACO", async () => {
    const desligar = () => formaCrua.DELETE(req("/x", tokens.operador, { method: "DELETE" }), ctx(taco.berinjelaCozida));
    expect((await desligar()).status).toBe(200);
    expect((await desligar()).status).toBe(404);
    expect((await ligar(taco.berinjelaCozida, { forma_crua_id: taco.berinjelaCozida, modo_preparo: "COZIDO" })).status).toBe(422);
    expect((await ligar(taco.berinjelaCozida, { forma_crua_id: taco.berinjelaCrua, modo_preparo: "CRU" })).status).toBe(400);
    const r = await ligar(taco.berinjelaCozida, { forma_crua_id: taco.berinjelaCrua, modo_preparo: "COZIDO" });
    expect(await json(r)).toMatchObject({ forma_crua_id: taco.berinjelaCrua, modo_preparo: "COZIDO" });
    await importarFormas();
  });
});

describe("M4: editar ingrediente", () => {
  // 04/11: toda edição leva o motivo (registro de alterações).
  const editar = (id: number, body: object) => ingrediente.PUT(req("/x", tokens.operador, { method: "PUT", body: { motivo: "teste", ...body } }), ctx(id));

  it("TACO: só categoria de carboidrato e RDS; rótulo: tudo", async () => {
    expect((await editar(taco.arroz, { nome: "Outro nome" })).status).toBe(422);
    const original = await prisma.ingrediente.findUniqueOrThrow({ where: { id: taco.arroz } });
    expect((await json(await editar(taco.arroz, { rds_percentual: 80 }))).rds_percentual).toBe(80);
    await prisma.ingrediente.update({ where: { id: taco.arroz }, data: { rds_percentual: original.rds_percentual } });

    const rotulo = await json(
      await ingredientes.POST(
        req("/api/ingredientes", tokens.operador, {
          method: "POST",
          body: { nome: `${PREFIXO}Achocolatado`, grupo_alimentar: "PRODUTOS_ACUCARADOS", categoria_carboidrato: "SACAROSE", carboidrato_g: 80 },
        }),
      ),
    );
    expect(await json(await editar(rotulo.id, { nome: `${PREFIXO}Achocolatado diet`, carboidrato_g: 40 }))).toMatchObject({
      nome: `${PREFIXO}Achocolatado diet`,
      carboidrato_g: 40,
    });
    expect((await editar(rotulo.id, {})).status).toBe(400);
  });

  it("FC-09: reimportar a TACO mantém a categoria e o RDS editados na tela", async () => {
    const original = await prisma.ingrediente.findUniqueOrThrow({ where: { id: taco.arroz } });
    try {
      expect((await editar(taco.arroz, { categoria_carboidrato: "MALTODEXTRINA", rds_percentual: 57 })).status).toBe(200);
      await importarTaco();
      expect(await prisma.ingrediente.findUniqueOrThrow({ where: { id: taco.arroz } })).toMatchObject({
        categoria_carboidrato: "MALTODEXTRINA",
        rds_percentual: 57,
      });
    } finally {
      // Com o FC-09, a reimportação do próximo globalSetup não desfaria a edição: o teste a desfaz.
      await prisma.ingrediente.update({
        where: { id: taco.arroz },
        data: { categoria_carboidrato: original.categoria_carboidrato, rds_percentual: original.rds_percentual },
      });
    }
  });
});

import { z } from "zod";
import {
  CategoriaCarboidrato,
  GrupoAlimentar,
  ModoPreparo,
  OrigemIngrediente,
  Periodo,
  Presenca,
  SituacaoBloqueio,
  TipoRestricao,
} from "@bandeja/dados";

export const login = z.object({
  email: z.email(),
  senha: z.string().min(1),
});

export const buscaIngredientes = z.object({
  busca: z.string().trim().max(100).optional(),
  grupo: z.enum(GrupoAlimentar).optional(),
  origem: z.enum(OrigemIngrediente).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(100).default(50),
});

const semRepetir = (marcadores: { categoria_codigo: string }[]) =>
  new Set(marcadores.map((m) => m.categoria_codigo)).size === marcadores.length;

const marcador = z.object({
  categoria_codigo: z.string().trim().min(1),
  presenca: z.enum(Presenca),
  conferido_por_1: z.string().trim().min(1).optional(),
  conferido_por_2: z.string().trim().min(1).optional(),
});

const listaMarcadores = z.array(marcador).refine(semRepetir, "categoria repetida");

const por100g = z.number().min(0).nullable().optional();

export const ingredienteRotulo = z.object({
  nome: z.string().trim().min(1).max(200),
  grupo_alimentar: z.enum(GrupoAlimentar),
  categoria_carboidrato: z.enum(CategoriaCarboidrato),
  energia_kcal: por100g,
  proteina_g: por100g,
  lipideos_g: por100g,
  carboidrato_g: por100g,
  fibra_g: por100g,
  cinzas_g: por100g,
  umidade_g: por100g,
  rds_percentual: z.number().min(0).max(100).nullable().optional(),
  marcadores: listaMarcadores.default([]),
});

export const substituicaoMarcadores = z.object({ marcadores: listaMarcadores });

export const buscaPreparacoes = z.object({ busca: z.string().trim().max(100).optional() });

const unicos = (valores: unknown[]) => new Set(valores).size === valores.length;

export const preparacao = z.object({
  nome: z.string().trim().min(1).max(200),
  porcao_g: z.number().positive().max(5000),
  itens: z
    .array(
      z.object({
        ingrediente_id: z.number().int().positive(),
        quantidade_crua_g: z.number().positive().max(100_000),
        modo_preparo: z.enum(ModoPreparo),
      }),
    )
    .min(1)
    .refine((itens) => unicos(itens.map((i) => i.ingrediente_id)), "ingrediente repetido"),
  // RF03: "pode conter" por contato na cozinha.
  contato_cozinha: z
    .array(z.object({ categoria_codigo: z.string().trim().min(1), motivo: z.string().trim().min(1).max(200) }))
    .refine((lista) => unicos(lista.map((c) => c.categoria_codigo)), "categoria repetida")
    .default([]),
});

export type DadosPreparacaoEntrada = z.infer<typeof preparacao>;

export const cardapio = z.object({
  data: z.iso.date(),
  periodo: z.enum(Periodo),
  itens: z
    .array(z.object({ preparacao_id: z.number().int().positive(), preco: z.number().min(0).max(10_000) }))
    .min(1)
    .refine((itens) => unicos(itens.map((i) => i.preparacao_id)), "preparação repetida"),
});

export const buscaCardapios = z.object({
  data: z.iso.date().optional(),
  periodo: z.enum(Periodo).optional(),
});

export const consultaAluno = z.object({ aluno_id: z.coerce.number().int().positive().optional() });

// RF06: só tipo e categoria; limite só para acompanhamento.
export const perfilSaude = z.object({
  consentimento: z.boolean().optional(),
  restricoes: z
    .array(
      z.object({
        categoria_codigo: z.string().trim().min(1),
        tipo: z.enum(TipoRestricao),
        limite_notificacao: z.number().int().min(0).max(50).optional(),
      }),
    )
    .refine((lista) => unicos(lista.map((r) => r.categoria_codigo)), "categoria repetida"),
});

// Fig. 7: sem `decisao`, uma venda com item em ATENÇÃO só devolve o alerta para o operador confirmar.
export const venda = z.object({
  aluno_id: z.number().int().positive(),
  itens: z
    .array(z.number().int().positive())
    .min(1)
    .max(100)
    .refine((itens) => unicos(itens), "item repetido"),
  decisao: z.enum(["CONCLUIR", "ENCERRAR"]).optional(),
});

export const buscaAlunos = z.object({ busca: z.string().trim().max(100).optional() });

export const periodoHistorico = z.object({ de: z.iso.date().optional(), ate: z.iso.date().optional() });

export const novoBloqueio = z.object({
  aluno_id: z.number().int().positive(),
  preparacao_id: z.number().int().positive(),
});

export const buscaBloqueios = z.object({ situacao: z.enum(SituacaoBloqueio).optional() });

export const decisaoBloqueio = z.object({ situacao: z.enum(["EXECUTADA", "RECUSADA"]) });

// RF12: data/hora com fuso (a tela converte a hora local); texto curto só para "Outro".
export const registroSintoma = z.object({
  sintoma_codigo: z.string().trim().min(1),
  data_hora: z.iso.datetime({ offset: true }),
  observacao: z.string().trim().min(1).max(100).optional(),
});

export const consultaPanorama = z.object({
  de: z.iso.date(),
  ate: z.iso.date(),
  periodo: z.enum(Periodo).optional(),
});

export type PanoramaEntrada = z.infer<typeof consultaPanorama>;
export type SintomaEntrada = z.infer<typeof registroSintoma>;
export type VendaEntrada = z.infer<typeof venda>;
export type CardapioEntrada = z.infer<typeof cardapio>;
export type PerfilEntrada = z.infer<typeof perfilSaude>;
export type IngredienteRotulo = z.infer<typeof ingredienteRotulo>;
export type MarcadorEntrada = z.infer<typeof marcador>;

function invalido(erro: z.ZodError) {
  return Response.json(
    { erro: "Dados inválidos", detalhes: erro.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })) },
    { status: 400 },
  );
}

export async function lerCorpo<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  const corpo = await req.json().catch(() => undefined);
  const r = schema.safeParse(corpo);
  return r.success ? r.data : invalido(r.error);
}

export async function lerId(ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function lerConsulta<T extends z.ZodType>(req: Request, schema: T): z.infer<T> | Response {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const r = schema.safeParse(params);
  return r.success ? r.data : invalido(r.error);
}

import { textos } from "@bandeja/dominio";
import type { SintomaEntrada } from "@/lib/validacao";
import { buscarSintoma, gravarRegistro, itensComprados, listarSintomas } from "@/repositories/sintomas";
import { ErroNegocio } from "./erros";

const SINTOMA_OUTRO = "OUTRO";
const TOLERANCIA_FUTURO_MS = 5 * 60_000;
const JANELA_ALIMENTO_MS = 24 * 60 * 60_000; // D3 (S2): compras nas 24 h antes do sintoma
const ORDEM_GRUPOS = ["PELE", "BOCA_GARGANTA", "BARRIGA", "RESPIRACAO", "OUTROS"] as const;

// RF13: o aviso fixo vem junto da lista para qualquer tela (web ou app futuro) mostrar o mesmo texto.
export async function listaDeSintomas() {
  const sintomas = await listarSintomas();
  return {
    aviso: textos.avisoSintomas,
    grupos: ORDEM_GRUPOS.map((grupo) => ({
      grupo,
      sintomas: sintomas.filter((s) => s.grupo === grupo).map(({ codigo, descricao }) => ({ codigo, descricao })),
    })),
  };
}

// D3: o que o aluno pode indicar como comido antes de um sintoma em `data_hora`.
export function itensParaSintoma(aluno_id: number, data_hora: Date) {
  return itensComprados(aluno_id, new Date(data_hora.getTime() - JANELA_ALIMENTO_MS), data_hora);
}

// D3: texto único para o diário, a tela do RF20 e o PDF. Só registro: nada sugere causa (§4.8).
export function descreverAlimento({ itens_cantina, alimento_externo }: { itens_cantina: string[]; alimento_externo: string | null }) {
  const partes = [...(itens_cantina.length ? [`Na cantina: ${itens_cantina.join(", ")}.`] : []), ...(alimento_externo ? [`De fora: ${alimento_externo}.`] : [])];
  return partes.length ? `Comeu antes. ${partes.join(" ")}` : null;
}

// RF12 / doc §4.8: só grava. Nenhum cálculo, alerta, contagem ou notificação.
export async function registrarSintoma(aluno_id: number, dados: SintomaEntrada, agora = new Date()) {
  if (!(await buscarSintoma(dados.sintoma_codigo))) throw new ErroNegocio(`Sintoma inexistente: ${dados.sintoma_codigo}`);
  // Doc v3 §4.8: no "Outro" o texto é opcional; nos demais, não se aceita texto.
  if (dados.sintoma_codigo !== SINTOMA_OUTRO && dados.observacao) throw new ErroNegocio('O texto livre é só para o sintoma "Outro"');
  const data_hora = new Date(dados.data_hora);
  if (data_hora.getTime() > agora.getTime() + TOLERANCIA_FUTURO_MS) throw new ErroNegocio("A data e a hora não podem estar no futuro");
  // D3 (S3): indicar o alimento é obrigatório; o item precisa ser de compra concluída do próprio aluno, dentro da janela.
  if (!dados.itens.length && !dados.alimento_externo) {
    throw new ErroNegocio("Indique o que comeu antes: um item comprado na cantina ou o alimento de fora");
  }
  if (dados.itens.length) {
    const permitidos = new Set((await itensParaSintoma(aluno_id, data_hora)).map((i) => `${i.venda_id}:${i.item_cardapio_id}`));
    if (dados.itens.some((i) => !permitidos.has(`${i.venda_id}:${i.item_cardapio_id}`))) {
      throw new ErroNegocio("Só podem ser indicados itens das suas compras nas 24 h antes do sintoma");
    }
  }
  return gravarRegistro(aluno_id, {
    sintoma_codigo: dados.sintoma_codigo,
    data_hora,
    observacao: dados.observacao ?? null,
    alimento_externo: dados.alimento_externo ?? null,
    itens: dados.itens,
  });
}

import { textos } from "@bandeja/dominio";
import type { SintomaEntrada } from "@/lib/validacao";
import { buscarSintoma, gravarRegistro, listarSintomas } from "@/repositories/sintomas";
import { ErroNegocio } from "./erros";

const SINTOMA_OUTRO = "OUTRO";
const TOLERANCIA_FUTURO_MS = 5 * 60_000;
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

// RF12 / doc §4.8: só grava. Nenhum cálculo, alerta, contagem ou notificação.
export async function registrarSintoma(aluno_id: number, dados: SintomaEntrada, agora = new Date()) {
  if (!(await buscarSintoma(dados.sintoma_codigo))) throw new ErroNegocio(`Sintoma inexistente: ${dados.sintoma_codigo}`);
  // Doc v3 §4.8: no "Outro" o texto é opcional; nos demais, não se aceita texto.
  if (dados.sintoma_codigo !== SINTOMA_OUTRO && dados.observacao) throw new ErroNegocio('O texto livre é só para o sintoma "Outro"');
  const data_hora = new Date(dados.data_hora);
  if (data_hora.getTime() > agora.getTime() + TOLERANCIA_FUTURO_MS) throw new ErroNegocio("A data e a hora não podem estar no futuro");
  return gravarRegistro(aluno_id, dados.sintoma_codigo, data_hora, dados.observacao ?? null);
}

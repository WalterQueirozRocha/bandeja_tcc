import { textos } from "./textos";

export type TipoRestricao = "ALERGIA" | "DOENCA_CELIACA" | "INTOLERANCIA" | "RELIGIOSA" | "PREFERENCIA";
export type Compatibilidade = "COMPATIVEL" | "ATENCAO" | "BLOQUEADO";
export type Alerta = { resultado: Exclude<Compatibilidade, "COMPATIVEL">; categoria: string | null; texto: string };

export const EXCLUSAO_ESTRITA: readonly TipoRestricao[] = ["ALERGIA", "DOENCA_CELIACA"];

export type PerfilCompatibilidade = {
  restricoes: { categoria: string; tipo: TipoRestricao }[];
  // Preparações com bloqueio do responsável já EXECUTADO pelo operador (P6).
  bloqueios: number[];
};

// Doc §4.6 / Fig. 7. `presentes` = categorias derivadas da preparação (contém ou pode conter), com o nome para o alerta.
export function avaliar(
  perfil: PerfilCompatibilidade,
  preparacao: { id: number; nome: string },
  presentes: { categoria: string; nome: string }[],
): { resultado: Compatibilidade; alertas: Alerta[] } {
  const alertas: Alerta[] = [];
  if (perfil.bloqueios.includes(preparacao.id)) {
    alertas.push({ resultado: "BLOQUEADO", categoria: null, texto: textos.bloqueioResponsavel(preparacao.nome) });
  }
  for (const r of perfil.restricoes) {
    const presente = presentes.find((p) => p.categoria === r.categoria);
    if (!presente) continue;
    if (r.tipo === "DOENCA_CELIACA") alertas.push({ resultado: "BLOQUEADO", categoria: r.categoria, texto: textos.doencaCeliaca() });
    else if (r.tipo === "ALERGIA") alertas.push({ resultado: "BLOQUEADO", categoria: r.categoria, texto: textos.alergia(presente.nome) });
    else alertas.push({ resultado: "ATENCAO", categoria: r.categoria, texto: textos.acompanhamento(presente.nome) });
  }
  const resultado = alertas.some((a) => a.resultado === "BLOQUEADO")
    ? "BLOQUEADO"
    : alertas.length
      ? "ATENCAO"
      : "COMPATIVEL";
  return { resultado, alertas };
}

// As planilhas da equipe foram importadas com conferentes provisórios ("PENDENTE 1" e "PENDENTE 2") para liberar
// a plataforma antes da conferência dupla real (D6). Para quem usa, esses dados aparecem como "não conferidos",
// e não como conferidos: o nome provisório não é uma pessoa que conferiu.
const PROVISORIO = /^\s*pendente\b/i;

export function conferenteProvisorio(nome: string | null | undefined) {
  return !!nome && PROVISORIO.test(nome);
}

type ComConferencia = { conferido_por_1?: string | null; conferido_por_2?: string | null };

// Conferência dupla registrada só com nomes provisórios (vale para o pareamento de IG e para marcadores avulsos).
export function conferenciaProvisoria(c: ComConferencia | null | undefined) {
  return !!c && (conferenteProvisorio(c.conferido_por_1) || conferenteProvisorio(c.conferido_por_2));
}

type ComMarcacao = {
  origem: string;
  marcacao_conferida_em: Date | null;
  marcacao_conferida_por_1?: string | null;
  marcacao_conferida_por_2?: string | null;
};

// Situação da marcação de alergênicos de um alimento da TACO ou de outra tabela (o rótulo não passa por conferência).
// PENDENTE: sem conferência, a ficha técnica recusa o alimento. NAO_CONFERIDA: liberada com conferentes provisórios.
export function situacaoMarcacao(i: ComMarcacao): "NAO_SE_APLICA" | "PENDENTE" | "NAO_CONFERIDA" | "CONFERIDA" {
  if (i.origem === "ROTULO") return "NAO_SE_APLICA";
  if (!i.marcacao_conferida_em) return "PENDENTE";
  if (conferenteProvisorio(i.marcacao_conferida_por_1) || conferenteProvisorio(i.marcacao_conferida_por_2)) return "NAO_CONFERIDA";
  return "CONFERIDA";
}

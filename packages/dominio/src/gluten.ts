export const CEREAIS_COM_GLUTEN = ["TRIGO", "CENTEIO", "CEVADA", "AVEIA"] as const;

// S1: o bloqueio do celíaco depende só do marcador GLUTEN, então todo cereal com glúten exige o marcador.
export function faltaMarcadorGluten(categorias: readonly string[]): boolean {
  return (
    categorias.some((c) => (CEREAIS_COM_GLUTEN as readonly string[]).includes(c)) &&
    !categorias.includes("GLUTEN")
  );
}

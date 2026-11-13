// Fábricas usadas só pelos testes (fora da cobertura).
import type { Composicao, ItemComposicao } from "./composicao";

export const composicao = (parcial: Partial<Composicao>): Composicao => ({
  energia_kcal: 0, proteina_g: 0, lipideos_g: 0, carboidrato_g: 0, fibra_g: 0, cinzas_g: 0, umidade_g: 0,
  ...parcial,
});

export const item = (parcial: Partial<ItemComposicao>): ItemComposicao => ({
  nome: "Ingrediente",
  quantidade_crua_g: 100,
  modo: "CRU",
  fator_coccao: 1,
  composicao: composicao({}),
  forma_preparada: false,
  ...parcial,
});

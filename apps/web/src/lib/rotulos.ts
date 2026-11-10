// A4: nomes legíveis para os códigos do banco. Sem importar os enums do Prisma (as telas de cliente também usam).

export const GRUPO_ALIMENTAR: Record<string, string> = {
  CEREAIS: "Cereais e derivados",
  VERDURAS_HORTALICAS: "Verduras, hortaliças e derivados",
  FRUTAS: "Frutas e derivados",
  GORDURAS_OLEOS: "Gorduras e óleos",
  PESCADOS_FRUTOS_MAR: "Pescados e frutos do mar",
  CARNES: "Carnes e derivados",
  LEITE: "Leite e derivados",
  BEBIDAS: "Bebidas",
  OVOS: "Ovos e derivados",
  PRODUTOS_ACUCARADOS: "Produtos açucarados",
  MISCELANEAS: "Miscelâneas",
  OUTROS_INDUSTRIALIZADOS: "Outros alimentos industrializados",
  ALIMENTOS_PREPARADOS: "Alimentos preparados",
  LEGUMINOSAS: "Leguminosas e derivados",
  NOZES_SEMENTES: "Nozes e sementes",
};

export const MODO_PREPARO: Record<string, string> = {
  CRU: "Cru",
  COZIDO: "Cozido",
  ASSADO: "Assado",
  GRELHADO: "Grelhado",
  FRITO: "Frito",
};

// Categorias de carboidrato de Rytz et al. (2019).
export const CATEGORIA_CARBOIDRATO: Record<string, string> = {
  GLICOSE: "Glicose",
  FRUTOSE: "Frutose",
  GALACTOSE: "Galactose",
  MALTOSE: "Maltose",
  TREALOSE: "Trealose",
  SACAROSE: "Sacarose",
  LACTOSE: "Lactose",
  ISOMALTULOSE: "Isomaltulose",
  MALTOTRIOSE_MALTOTETRAOSE: "Maltotriose / maltotetraose",
  AMIDO: "Amido",
  MALTODEXTRINA: "Maltodextrina",
  MALTITOL: "Maltitol",
  XILITOL: "Xilitol",
  NENHUM: "Nenhum",
};

export const TIPO_RESTRICAO: Record<string, string> = {
  ALERGIA: "Alergia",
  DOENCA_CELIACA: "Doença celíaca",
  INTOLERANCIA: "Intolerância",
  RELIGIOSA: "Restrição religiosa",
  PREFERENCIA: "Preferência",
};

// Exclusão estrita: bloqueia a venda (RF10). As outras são de acompanhamento (RF09).
export const EXCLUSAO_ESTRITA = ["ALERGIA", "DOENCA_CELIACA"];

export const TIPO_CATEGORIA: Record<string, string> = {
  ALERGENICO: "Alergênicos (RDC nº 727/2022)",
  LACTOSE: "Lactose",
  GLUTEN: "Glúten",
  ORIGEM_ANIMAL: "Origem animal",
};

export const PAPEL: Record<string, string> = {
  OPERADOR: "Operador",
  ALUNO: "Aluno",
  RESPONSAVEL: "Responsável",
  COORDENACAO: "Coordenação",
};

export const PERIODO: Record<string, string> = { MANHA: "Manhã", TARDE: "Tarde" };

export const PRESENCA: Record<string, string> = { CONTEM: "Contém", PODE_CONTER: "Pode conter" };

export const ORIGEM_INGREDIENTE: Record<string, string> = { TACO: "TACO", ROTULO: "Rótulo", OUTRA_TABELA: "Outra tabela" };

export const LISTA_IG: Record<string, string> = { LISTA_1: "Lista 1", LISTA_2: "Lista 2", ESTIMADO: "Estimado (Louie et al., 2015)" };

export const opcoes = (rotulos: Record<string, string>) => Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }));

// Data ISO (aaaa-mm-dd) para dd/mm/aaaa, sem fuso.
export const dataBr = (iso: string) => iso.split("-").reverse().join("/");

import type { Papel } from "@bandeja/dados";

export const COOKIE_TEMA = "bandeja_tema";
export type Tema = "claro" | "escuro";

// D2: avisa o sino do cabeçalho para buscar de novo o número de não lidas.
export const EVENTO_NOTIFICACOES = "bandeja:notificacoes";

export const lerTema = (valor: string | undefined): Tema | undefined =>
  valor === "claro" || valor === "escuro" ? valor : undefined;

// Telas de cada perfil (Quadro 9), na ordem do menu. A primeira é a tela inicial depois do login.
export const LINKS: Record<Papel, { href: string; rotulo: string }[]> = {
  OPERADOR: [
    { href: "/atendimento", rotulo: "Atendimento" },
    { href: "/cardapios", rotulo: "Cardápios" },
    { href: "/preparacoes", rotulo: "Preparações" },
    { href: "/ingredientes", rotulo: "Ingredientes" },
    { href: "/fatores", rotulo: "Fatores" },
    { href: "/bloqueios", rotulo: "Bloqueios" },
    { href: "/panorama", rotulo: "Panorama" },
  ],
  ALUNO: [
    { href: "/cardapio", rotulo: "Cardápio" },
    { href: "/perfil", rotulo: "Meu perfil" },
    { href: "/historico", rotulo: "Histórico" },
    { href: "/sintomas", rotulo: "Sintomas" },
  ],
  RESPONSAVEL: [
    { href: "/cardapio", rotulo: "Cardápio" },
    { href: "/perfil", rotulo: "Perfil de saúde" },
    { href: "/historico", rotulo: "Histórico" },
    { href: "/bloqueios", rotulo: "Bloqueios" },
    { href: "/registros-sintomas", rotulo: "Registros de sintomas" },
  ],
  COORDENACAO: [
    { href: "/panorama", rotulo: "Panorama" },
    { href: "/cardapio", rotulo: "Cardápio" },
    { href: "/registros-sintomas", rotulo: "Pedidos de registros" },
    { href: "/usuarios", rotulo: "Usuários" },
    { href: "/ingredientes", rotulo: "Ingredientes" },
  ],
};

export const telaInicial = (papel: Papel) => LINKS[papel][0]!.href;

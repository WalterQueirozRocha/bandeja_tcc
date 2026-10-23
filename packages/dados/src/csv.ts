import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Planilhas da equipe (versionadas como evidência da conferência em dupla e das avaliações).
export const planilha = (nome: string) => new URL(`../planilhas/${nome}`, import.meta.url);

// ponytail: CSV com ';' sem aspas (padrão do Excel pt-BR); trocar por biblioteca se aparecer ';' dentro de campo.
export function lerLinhas(caminho: string | URL): string[][] {
  return readFileSync(caminho, "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => l.split(";").map((c) => c.trim()));
}

// Primeira linha = cabeçalho. `linha` é o número da linha no arquivo (para mensagens de erro).
export function lerTabela(caminho: string | URL): (Record<string, string> & { linha: string })[] {
  const [cabecalho = [], ...linhas] = lerLinhas(caminho);
  return linhas.map((celulas, i) => ({
    ...Object.fromEntries(cabecalho.map((nome, j) => [nome, celulas[j] ?? ""])),
    linha: String(i + 2),
  }));
}

export function escreverTabela(caminho: string | URL, cabecalho: string[], linhas: string[][]) {
  mkdirSync(dirname(caminho instanceof URL ? fileURLToPath(caminho) : caminho), { recursive: true });
  writeFileSync(caminho, [cabecalho, ...linhas].map((l) => l.join(";")).join("\n") + "\n", "utf8");
}

// Aceita vírgula decimal (Excel pt-BR).
export function numero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  if (texto === "" || Number.isNaN(n)) throw new Error(`número inválido: "${texto}"`);
  return n;
}

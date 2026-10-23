import { prisma } from "./banco";
import {
  importarFatores,
  importarFormas,
  importarIg,
  importarMarcadores,
  importarTaco,
  importarUsuarios,
  sugerirFormasCsv,
} from "./importadores";

// Uso: npm run importar -- <etapa>   (usuarios: npm run importar -- usuarios --senha=...)
const senha = process.argv.find((a) => a.startsWith("--senha="))?.slice("--senha=".length);
const ETAPAS: Record<string, () => Promise<string> | string> = {
  taco: importarTaco,
  "formas:sugerir": sugerirFormasCsv,
  formas: importarFormas,
  fatores: importarFatores,
  marcadores: importarMarcadores,
  ig: importarIg,
  usuarios: () => importarUsuarios(senha),
};
// `usuarios` fica fora do `tudo`: a planilha não é versionada e pede a senha inicial.
const TUDO = ["taco", "formas", "fatores", "marcadores", "ig"];

const etapa = process.argv[2] ?? "";
const fila = etapa === "tudo" ? TUDO : [etapa];

async function main() {
  if (!fila.every((e) => e in ETAPAS)) {
    throw new Error(`etapa desconhecida "${etapa}". Use: ${[...Object.keys(ETAPAS), "tudo"].join(", ")}`);
  }
  for (const e of fila) console.log(`${e}: ${await ETAPAS[e]!()}`);
}

main()
  .catch((e: Error) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

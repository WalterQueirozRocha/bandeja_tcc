import { prisma } from "@bandeja/dados";
import { avaliarA1, importarA1 } from "./a1";
import { avaliarA3 } from "./a3";

// Uso: npm run avaliar -- a1:importar | a1 | a3
const ETAPAS: Record<string, () => Promise<string>> = { "a1:importar": importarA1, a1: avaliarA1, a3: avaliarA3 };
const etapa = process.argv[2] ?? "";

async function main() {
  const executar = ETAPAS[etapa];
  if (!executar) throw new Error(`etapa desconhecida "${etapa}". Use: ${Object.keys(ETAPAS).join(", ")}`);
  console.log(await executar());
}

main()
  .catch((e: Error) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

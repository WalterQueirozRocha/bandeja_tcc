import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile("../../.env");
} catch {}

// Os testes de integração apagam e recriam dados: nunca rodam no banco de desenvolvimento.
if (!process.env.CI) {
  if (!process.env.DATABASE_URL_TESTE) throw new Error("Defina DATABASE_URL_TESTE no .env");
  process.env.DATABASE_URL = process.env.DATABASE_URL_TESTE;
}
process.env.JWT_SEGREDO ??= "segredo-dos-testes";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/preparar-banco.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});

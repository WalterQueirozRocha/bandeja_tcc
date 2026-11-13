import { execSync } from "node:child_process";

// Banco de teste: migrações, seed, TACO com as formas preparadas e as planilhas da equipe.
export default async function prepararBanco() {
  execSync("npx prisma migrate deploy", { cwd: "../..", stdio: "inherit", env: process.env });
  const { semear } = await import("@bandeja/dados/src/seed");
  const imp = await import("@bandeja/dados/src/importadores");
  const { prisma } = await import("@bandeja/dados");
  await semear();
  await imp.importarTaco();
  await imp.importarFormas();
  await imp.importarFatores();
  await imp.importarMarcadores();
  await imp.importarIg();
  // D6: a ficha técnica recusa alimento da TACO não conferido. No banco de teste, todos ficam conferidos;
  // os testes da recusa tiram a conferência do alimento que usam.
  await prisma.ingrediente.updateMany({
    where: { origem: "TACO", marcacao_conferida_em: null },
    data: { marcacao_conferida_por_1: "Teste A", marcacao_conferida_por_2: "Teste B", marcacao_conferida_em: new Date() },
  });
  await prisma.$disconnect();
}

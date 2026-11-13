import { expect, test, type Page } from "@playwright/test";

// Telas de cadastro (plano das telas): cada projeto (computador, celular) usa dados próprios.
async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("operador cria uma preparação pela ficha técnica (RF02)", async ({ page }, info) => {
  await entrar(page, "operador@gmail.com");
  await page.goto("/preparacoes/nova");
  const nome = `E2E Ficha ${info.project.name}`;
  await page.getByLabel("Nome").fill(nome);
  // D6: alimento da TACO sem conferência é recusado; o exemplo usa um ingrediente de rótulo.
  await page.getByLabel("Buscar ingrediente para adicionar").fill("E2E Polvilho");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: /E2E Polvilho de rótulo/ }).click();
  await expect(page.getByLabel("Modo de preparo")).toHaveValue("CRU");
  await page.getByRole("button", { name: "Criar preparação" }).click();
  // A primeira compilação da ficha no servidor de desenvolvimento pode passar de 5 s.
  await expect(page).toHaveURL(/\/preparacoes\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
});

test("operador publica um cardápio (RF05)", async ({ page }, info) => {
  await entrar(page, "operador@gmail.com");
  const data = info.project.name === "desktop" ? "2098-12-30" : "2098-12-29";
  // A data vem pela URL: no celular emulado, preencher o campo de data não é confiável.
  await page.goto(`/cardapios/novo?data=${data}`);
  await expect(page.getByLabel("Data")).toHaveValue(data);
  await page.getByLabel("Preparação").selectOption({ label: "E2E Arroz" });
  await page.getByLabel("Preço (R$)").fill("4");
  await page.getByRole("button", { name: "Publicar cardápio" }).click();
  await expect(page).toHaveURL(/\/cardapios$/);
  await expect(page.getByText(data.split("-").reverse().join("/"))).toBeVisible();
});

test("responsável vê e salva o perfil de saúde (RF06)", async ({ page }, info) => {
  await entrar(page, "responsavel@gmail.com");
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Perfil de saúde" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Amendoim" })).toContainText("Bloqueia a venda");
  await page.getByLabel("Categoria").selectOption({ label: info.project.name === "desktop" ? "Ovos" : "Soja" });
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toHaveText("Perfil salvo.");
});

test("coordenação cria um aluno (B1)", async ({ page }, info) => {
  await entrar(page, "coordenacao@gmail.com");
  await page.goto("/usuarios");
  const nome = `Aluno E2E ${info.project.name}`;
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("E-mail", { exact: true }).fill(`aluno-${info.project.name}@e2e.teste`);
  await page.getByLabel("Série").fill("6º ano");
  await page.getByLabel(/Senha inicial/).fill("123456");
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await expect(page).toHaveURL(/\/usuarios\/\d+$/);
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Responsáveis" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

// Requer o banco de desenvolvimento com seed e TACO importada.
test("operador entra e busca um ingrediente", async ({ page }) => {
  await page.goto("/ingredientes");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-mail").fill("operador@gmail.com");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/atendimento$/); // A1: a primeira tela do operador
  await page.goto("/ingredientes");

  await page.getByPlaceholder("Buscar por nome").fill("arroz, tipo 1");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("cell", { name: "Arroz, tipo 1, cozido" })).toBeVisible();
  await expect(page.getByText("2 encontrados")).toBeVisible();
});

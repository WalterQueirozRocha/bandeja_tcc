import { expect, test } from "@playwright/test";

// RF15: a coordenação abre o panorama do período do cardápio de exemplo.
test("coordenação vê o panorama nutricional", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("coordenacao@gmail.com");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/panorama$/);

  await page.goto("/panorama?de=2098-12-31&ate=2098-12-31");
  await expect(page.getByRole("heading", { name: "Panorama nutricional" })).toBeVisible();
  await expect(page.getByText("1 cardápios · 3 itens ofertados")).toBeVisible();
  await expect(page.getByText("Amendoim: 0 contém · 1 pode conter")).toBeVisible();
});

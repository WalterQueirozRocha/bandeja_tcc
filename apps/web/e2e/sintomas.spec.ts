import { expect, test } from "@playwright/test";

// CT20 na tela: aviso fixo visível e registro salvo (computador e celular). D3: o alimento é obrigatório.
test("aluno registra um sintoma com o aviso fixo na tela", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("aluno@gmail.com");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cardapio$/);

  await page.goto("/sintomas");
  await expect(page.getByTestId("aviso-sintomas")).toHaveText(
    "Este registro não é um diagnóstico. Se você sentir falta de ar, aperto na garganta, inchaço na boca ou tontura, avise agora um adulto da escola.",
  );
  await page.getByLabel("Dor ou cólica").check();
  await expect(page.getByRole("button", { name: "Registrar" })).toBeDisabled();
  await page.getByLabel("Alimento de fora da cantina").fill("lanche de casa");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByRole("status")).toHaveText("Registro salvo.");
  await expect(page.getByRole("listitem").filter({ hasText: "Dor ou cólica" }).first()).toContainText("De fora: lanche de casa.");
});

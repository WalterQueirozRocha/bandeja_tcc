import { expect, test } from "@playwright/test";

// Fig. 7 no balcão: bloqueio por alergia e confirmação na restrição de acompanhamento (CT14, CT18).
test("operador vê o bloqueio e a confirmação no atendimento", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("operador@gmail.com");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/atendimento$/);

  await page.goto("/atendimento?data=2098-12-31&periodo=MANHA");
  await expect(page.getByTestId("aviso-outra-data")).toContainText("Este não é o cardápio de hoje"); // FC-07
  await page.getByPlaceholder("Nome do aluno").fill("Aluno Teste");
  await page.getByRole("button", { name: "Buscar aluno" }).click();
  await page.getByLabel(/Aluno Teste/).check();

  await page.getByLabel(/E2E Paçoca/).check();
  await page.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page.getByTestId("resultado-venda")).toContainText("VENDA BLOQUEADA");
  await expect(page.getByTestId("resultado-venda")).toContainText("ALERGIA DECLARADA: Amendoim. Venda bloqueada.");

  await page.getByLabel(/E2E Mingau/).check();
  await page.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page.getByTestId("resultado-venda")).toContainText("RESTRIÇÃO DECLARADA: Lactose. Confirme com o aluno.");
  await page.getByRole("button", { name: "Encerrar venda" }).click();
  await expect(page.getByTestId("resultado-venda")).toContainText("Venda encerrada");
});

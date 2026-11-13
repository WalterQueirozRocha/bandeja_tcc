import { expect, test } from "@playwright/test";

// CT23: o mesmo aluno vê a mesma compatibilidade no computador e no celular (projetos "desktop" e "celular").
test("aluno vê a compatibilidade do cardápio", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("aluno@gmail.com");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cardapio$/);

  await page.goto("/cardapio?data=2098-12-31&periodo=MANHA");
  // Nome exato do item: o nome de outro item pode aparecer nas alternativas (RF16).
  const item = (nome: string) => page.getByTestId("item-cardapio").filter({ has: page.getByText(nome, { exact: true }) });
  const marca = (nome: string) => item(nome).getByTestId("compatibilidade");

  await expect(marca("E2E Paçoca")).toContainText("Bloqueado");
  await expect(marca("E2E Paçoca")).toContainText("ALERGIA DECLARADA: Amendoim. Venda bloqueada.");
  await expect(marca("E2E Mingau")).toContainText("Atenção");
  await expect(marca("E2E Arroz")).toHaveText("Compatível");
  // RF16: o item bloqueado sugere a alternativa compatível.
  await expect(item("E2E Paçoca").getByTestId("alternativas")).toHaveText("Alternativas compatíveis: E2E Arroz");
});

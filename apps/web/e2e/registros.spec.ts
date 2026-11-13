import { expect, test, type Page } from "@playwright/test";

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

// RF20 (decisão V3-1): o responsável pede, a coordenação autoriza sem ver, o responsável vê e baixa o PDF.
test("pedido de registros de sintomas: pedir, autorizar, ver e baixar", async ({ browser }, testInfo) => {
  const email = `responsavel.${testInfo.project.name}@e2e.teste`;
  const responsavel = await browser.newPage();
  await entrar(responsavel, email);
  await responsavel.goto("/registros-sintomas");
  await responsavel.getByRole("button", { name: "Pedir registros" }).click();
  await expect(responsavel.getByTestId("pedido-registros").first()).toContainText("SOLICITADA");

  const coordenacao = await browser.newPage();
  await entrar(coordenacao, "coordenacao@gmail.com");
  await coordenacao.goto("/registros-sintomas");
  const pedido = coordenacao.getByTestId("pedido-registros").filter({ hasText: email });
  await expect(pedido).not.toContainText("Enjoo"); // a coordenação não vê o conteúdo
  await pedido.getByRole("button", { name: "Autorizar" }).click();
  await expect(pedido).toContainText("AUTORIZADA");

  // D2: o responsável recebe a notificação da decisão no sino.
  await responsavel.reload();
  await expect(responsavel.getByTestId("sino")).toHaveAccessibleName("Notificações, 1 não lida");
  await responsavel.getByTestId("sino").click();
  await expect(responsavel.getByTestId("notificacoes")).toContainText("foi autorizado");
  await responsavel.getByRole("button", { name: "Marcar todas como lidas" }).click();
  await expect(responsavel.getByTestId("sino")).toHaveAccessibleName("Notificações, nenhuma não lida");

  await responsavel.goto("/registros-sintomas");
  await responsavel.getByRole("link", { name: "Ver registros" }).first().click();
  await expect(responsavel.getByTestId("registros-liberados")).toContainText("Enjoo");
  const download = responsavel.waitForEvent("download");
  await responsavel.getByRole("link", { name: "Baixar PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/^registros-sintomas-\d+\.pdf$/);

  // D4: o acesso fica registrado; a coordenação vê só quando foi.
  await coordenacao.reload();
  await expect(pedido.getByTestId("ultimo-acesso")).toContainText("Último acesso em");
});

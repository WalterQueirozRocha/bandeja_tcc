import { expect, test } from "@playwright/test";

test("página inicial abre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bandeja" })).toBeVisible();
});

import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile("../../.env");
} catch {}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/dados-exemplo.mts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // ponytail: com mais workers, o servidor de dev (compilando sob demanda) passa dos 5 s no login; suba se a máquina aguentar.
  workers: 2,
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});

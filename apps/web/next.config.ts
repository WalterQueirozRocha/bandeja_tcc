import type { NextConfig } from "next";

// O .env fica na raiz do monorepo; no deploy as variáveis vêm do ambiente.
try {
  process.loadEnvFile("../../.env");
} catch {}

const nextConfig: NextConfig = {
  transpilePackages: ["@bandeja/dados", "@bandeja/dominio"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

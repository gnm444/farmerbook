import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "cloudflare:workers": fileURLToPath(
        new URL("./tests/cloudflare-workers-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // The full UI suite imports large localized catalogs. Bound parallelism so
    // individual interaction tests are not starved on developer/CI machines.
    maxWorkers: 4,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15_000,
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});

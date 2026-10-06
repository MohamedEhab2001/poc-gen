import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  // tsconfig keeps jsx "preserve" for Next.js; component tests need React's
  // automatic runtime instead.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Integration suites rebuild/verify schema state; running files
    // sequentially keeps them from racing each other.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/types/server-only-stub.ts", import.meta.url)),
      "next/font/local": fileURLToPath(new URL("./src/types/test-stubs/next-font-local.ts", import.meta.url)),
    },
  },
});

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Ignores padrão do eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos de teste:
    "playwright-report/**",
    "test-results/**",
    "screenshots/**",
  ]),
  {
    // O renderer do funil usa <img> de propósito: a URL vem do documento e
    // aponta para hosts arbitrários (S3 do cliente, Unsplash, CDN próprio),
    // que o otimizador do next/image exigiria declarar um a um.
    files: ["src/funnel/render/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
]);

export default eslintConfig;

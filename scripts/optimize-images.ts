import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Converte todo PNG/JPG de `assets/originals/**` para AVIF + WebP (+ um PNG
 * comprimido de fallback) dentro de `public/**`, espelhando a mesma estrutura
 * de pastas — sem "originals" no meio do caminho.
 *
 * O bruto nunca vai pro `public/`: só o derivado otimizado é servido. Rode de
 * novo sempre que uma imagem em `assets/originals` for adicionada ou trocada.
 */
const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "assets", "originals");
const OUT_DIR = path.join(ROOT, "public");

const SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

async function optimizeOne(srcPath: string) {
  const relativo = path.relative(SRC_DIR, srcPath);
  const { dir, name } = path.parse(relativo);
  const outDir = path.join(OUT_DIR, dir);
  await mkdir(outDir, { recursive: true });

  const image = sharp(srcPath);
  const outBase = path.join(outDir, name);

  const [avif, webp, png] = await Promise.all([
    image.clone().avif({ quality: 55 }).toFile(`${outBase}.avif`),
    image.clone().webp({ quality: 88 }).toFile(`${outBase}.webp`),
    // Fallback só pra <picture>/navegadores muito antigos — mesma resolução, PNG recomprimido.
    image.clone().png({ quality: 80, compressionLevel: 9 }).toFile(`${outBase}.png`),
  ]);

  const original = (await stat(srcPath)).size;
  console.info(
    `${relativo} (${formatKb(original)}) -> avif ${formatKb(avif.size)}, webp ${formatKb(webp.size)}, png ${formatKb(png.size)}`,
  );
}

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(0)}kb`;
}

async function main() {
  let count = 0;
  for await (const file of walk(SRC_DIR)) {
    await optimizeOne(file);
    count++;
  }
  if (count === 0) {
    console.info(`Nenhuma imagem encontrada em ${path.relative(ROOT, SRC_DIR)}.`);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});

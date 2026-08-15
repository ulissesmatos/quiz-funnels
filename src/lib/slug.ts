/**
 * Slug para URL: `Meu Funil de Emagrecimento!` → `meu-funil-de-emagrecimento`.
 * Usado em slug de organização e de funil.
 */
export function slugify(value: string, maxLength = 48): string {
  const slug = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos após a decomposição
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return slug;
}

/**
 * Identificador interno do documento de funil: `Qual seu objetivo?` →
 * `qual_seu_objetivo`. Diferente do slug de URL, usa underscore — é o formato
 * que `SlugId` valida, e o que a IA lê e escreve nos ids de step e bloco.
 */
export function slugifyId(value: string, maxLength = 48): string {
  const id = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength)
    .replace(/_+$/g, "");

  // `SlugId` exige começar com letra.
  return /^[a-z]/.test(id) ? id : `id_${id}`;
}

/**
 * Acrescenta sufixo numérico até o id não colidir: `titulo`, `titulo_2`, …
 * Usado ao duplicar blocos e ao inserir blocos gerados pela IA.
 */
export function uniqueId(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}_${n}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}_${Date.now()}`;
}

/**
 * Máscara progressiva de telefone BR, aplicada enquanto a pessoa digita:
 * `11987654321` → `(11) 98765-4321`. Cobre fixo (10 dígitos) e celular (11,
 * começando com 9) — o formato segue o tanto que já foi digitado, sem
 * depender de saber de antemão se é fixo ou celular.
 */
export function formatBrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Telefone BR plausível: DDD (2 dígitos) + 8 dígitos (fixo) ou 9 (celular). */
export function isValidBrPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

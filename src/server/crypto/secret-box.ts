import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Criptografa segredo de terceiro (hoje: access/refresh token do Mercado
 * Pago de cada organização) antes de gravar no banco. AES-256-GCM: autentica
 * o ciphertext, então uma linha adulterada falha na descriptografia em vez de
 * devolver lixo silencioso.
 *
 * Formato gravado: `iv.authTag.ciphertext`, cada parte em base64url — sem
 * separador ambíguo, sem depender de o valor original não conter ".".
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = Buffer.from(env().ENCRYPTION_KEY, "base64");
  if (raw.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY precisa decodificar pra exatamente 32 bytes em base64 (tem ${raw.length}). Gere com: openssl rand -base64 32`,
    );
  }
  cachedKey = raw;
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64url")).join(".");
}

export function decryptSecret(stored: string): string {
  const [ivPart, authTagPart, ciphertextPart] = stored.split(".");
  if (!ivPart || !authTagPart || !ciphertextPart) {
    throw new Error("Segredo armazenado num formato inesperado — não é um valor gerado por encryptSecret.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Passe da avaliação pública: o servidor assina (HMAC-SHA256) o código do QR e a hora em que a
// pesquisa foi aberta. O envio só vale com um passe íntegro, do mesmo código, aberto há pelo menos
// alguns segundos e não há tempo demais. Robôs que só disparam o POST ficam sem passe, e cada
// passe exige abrir a pesquisa e esperar — sem usar IP nem dados de quem avalia.

/** Ninguém responde a pesquisa em menos que isso. */
export const PASS_MIN_AGE_MS = 4_000;
/** Uma aba esquecida aberta no balcão ainda envia no mesmo dia. */
export const PASS_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type PassCheck = "ok" | "invalid" | "too_fast" | "expired";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(secret: string, code: string, issuedAt: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${secret}:evaluation-pass`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(
    await crypto.subtle.sign("HMAC", key, encoder.encode(`${code.toUpperCase()}:${issuedAt}`)),
  );
}

/** Passe no formato "<emitido em ms>.<assinatura hex>". */
export async function issueEvaluationPass(secret: string, code: string, now = Date.now()) {
  return `${now}.${await sign(secret, code, now)}`;
}

/** Comparação em tempo constante, para a assinatura não vazar por tempo de resposta. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export async function checkEvaluationPass(
  secret: string,
  code: string,
  pass: string,
  now = Date.now(),
): Promise<PassCheck> {
  const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(pass);
  if (!match) return "invalid";
  const issuedAt = Number(match[1]);
  if (!sameText(match[2] ?? "", await sign(secret, code, issuedAt))) return "invalid";
  const age = now - issuedAt;
  if (age < PASS_MIN_AGE_MS) return age < -60_000 ? "invalid" : "too_fast";
  if (age > PASS_MAX_AGE_MS) return "expired";
  return "ok";
}

// Mensagem de erro para mostrar ao usuário. As mensagens das funções de servidor já vêm em
// português; uma falha de validação (Zod) chega como JSON técnico e nunca deve aparecer na tela.
export const INVALID_INPUT_MESSAGE =
  "Alguns dados não passaram na validação. Revise os campos e tente novamente.";

export function userMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!message) return fallback;
  if (message.startsWith("[") || message.startsWith("{")) return INVALID_INPUT_MESSAGE;
  return message;
}

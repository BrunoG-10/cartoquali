// Situação do acesso de um usuário (lida do Supabase Auth) e qual e-mail reenviar.

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function accessLabel(input: { hasAuth: boolean; lastSignInAt: string | null }): string {
  if (!input.hasAuth) return "Convite não enviado";
  if (!input.lastSignInAt) return "Aguardando primeiro acesso";
  return `Último acesso em ${dateTime.format(new Date(input.lastSignInAt)).replace(", ", " ")}`;
}

/**
 * Convite expira em 24 h. Quem nunca confirmou recebe o convite de novo; quem já confirmou
 * (ou já entrou) recebe o link de definir nova senha.
 */
export function resendKind(input: {
  lastSignInAt: string | null;
  confirmedAt: string | null;
}): "invite" | "recovery" {
  return !input.lastSignInAt && !input.confirmedAt ? "invite" : "recovery";
}

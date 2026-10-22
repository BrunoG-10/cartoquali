// Só no servidor. Lê a situação do acesso no Supabase Auth e reenvia o e-mail de acesso.
// Chamar SOMENTE depois de confirmar, pela RLS, que quem pede administra o cartório do usuário.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPasswordSetupUrl } from "@/lib/public-url";
import { resendKind } from "@/lib/user-access";

/**
 * Endereço para onde os e-mails de convite e recuperação levam: sempre o endereço oficial
 * (VITE_PUBLIC_APP_URL), definido aqui no servidor. Nunca vem do navegador, para que ninguém
 * consiga fazer um e-mail legítimo do CartoQuali apontar para outro site.
 */
export function officialSetupUrl(kind: "invite" | "recovery") {
  const url = getPasswordSetupUrl(kind);
  if (!/^https:\/\/|^http:\/\/localhost[:/]/.test(url))
    throw new Error("Endereço oficial do CartoQuali não configurado.");
  return url;
}

export async function readLastSignIn(authUserIds: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  await Promise.all(
    authUserIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      result.set(id, data.user?.last_sign_in_at ?? null);
    }),
  );
  return result;
}

export async function resendAccessEmail(input: {
  authUserId: string;
  email: string;
}): Promise<"invite" | "recovery"> {
  const inviteUrl = officialSetupUrl("invite");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(input.authUserId);
  if (error || !data.user) throw new Error("Acesso não encontrado para este usuário.");
  const kind = resendKind({
    lastSignInAt: data.user.last_sign_in_at ?? null,
    confirmedAt: data.user.email_confirmed_at ?? data.user.confirmed_at ?? null,
  });
  if (kind === "invite") {
    const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: inviteUrl,
    });
    if (!invite.error) return "invite";
    // Se o Auth não aceitar reenviar o convite, o link de definir senha resolve do mesmo jeito.
  }
  const recovery = await supabaseAdmin.auth.resetPasswordForEmail(input.email, {
    redirectTo: kind === "invite" ? inviteUrl : officialSetupUrl("recovery"),
  });
  if (recovery.error)
    throw new Error(
      recovery.error.message.toLowerCase().includes("rate")
        ? "Muitos e-mails enviados agora. Tente novamente em alguns minutos."
        : "Não foi possível reenviar o acesso.",
    );
  return "recovery";
}

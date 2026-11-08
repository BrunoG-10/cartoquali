import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { selfSignupErrorMessage, selfSignupSchema } from "@/lib/self-signup";
import { untypedDb } from "@/lib/untyped-db";

/**
 * Cadastro próprio da página comercial: cria o cartório com tudo pronto e envia por e-mail o link
 * para o administrador criar a senha. O teste de 7 dias começa no primeiro login.
 * Sem sessão por definição: o admin client só chama as duas funções do banco restritas ao
 * service_role, que validam tudo de novo, limitam por sessão do navegador e travam CNPJ e e-mail.
 */
export const startSelfSignup = createServerFn({ method: "POST" })
  .validator((input: unknown) => selfSignupSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store, max-age=0");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    // Robô preencheu o campo escondido: responde como sucesso e não cria nada.
    if (data.website) return { ok: true, duplicate: false, email: data.email };

    const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
    const sourceBytes = new TextEncoder().encode(`${secret}:self-signup:${data.submissionSession}`);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const sourceHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const email = data.email.toLowerCase();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = untypedDb(supabaseAdmin);

    const { data: check, error: checkError } = await db.rpc("check_self_signup", {
      _client_request_id: data.clientRequestId,
      _cnpj: data.cnpj,
      _email: email,
      _source_hash: sourceHash,
    });
    if (checkError) throw new Error(selfSignupErrorMessage(checkError.message));
    if ((check as { duplicate?: boolean } | null)?.duplicate)
      return { ok: true, duplicate: true, email };

    const { officialSetupUrl } = await import("@/lib/access-email.server");
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: officialSetupUrl("invite") },
    );
    if (inviteError || !invited.user) {
      console.error("[self-signup] invite failed", inviteError?.status);
      throw new Error(selfSignupErrorMessage(inviteError?.message.toLowerCase() ?? ""));
    }

    const { data: created, error } = await db.rpc("create_self_signup_registry", {
      _client_request_id: data.clientRequestId,
      _auth_user_id: invited.user.id,
      _source_hash: sourceHash,
      _nome: data.name,
      _cargo: data.roleTitle,
      _cartorio: data.registryName,
      _cnpj: data.cnpj,
      _cidade: data.city,
      _estado: data.state,
      _atribuicoes: data.attributions,
      _whatsapp: data.whatsapp,
      _email: email,
      _origem: data.origin ?? null,
      _cta: data.cta ?? null,
    });
    if (error) {
      console.error("[self-signup] registry creation failed", error.code);
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      throw new Error(selfSignupErrorMessage(error.message));
    }
    // Um envio repetido chegou ao mesmo tempo e já criou o cartório: o acesso extra sai.
    if ((created as { duplicate?: boolean } | null)?.duplicate) {
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      return { ok: true, duplicate: true, email };
    }
    return { ok: true, duplicate: false, email };
  });

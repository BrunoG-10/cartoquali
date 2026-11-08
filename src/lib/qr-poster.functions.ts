import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseQrPosterSettings, qrPosterImageInput, qrPosterSettingsInput } from "@/lib/qr-poster";
import { untypedDb } from "@/lib/untyped-db";

// Toda a autorização fica no banco: as funções resolvem o cartório pela sessão e só aceitam
// alteração de administrador do cartório, gestor ou administrador da plataforma.
function friendly(message: string | undefined, fallback: string) {
  if (message?.includes("forbidden")) return "Seu perfil não pode alterar o cartaz do QR Code.";
  if (message?.includes("invalid_cnpj")) return "Informe um CNPJ válido ou deixe em branco.";
  if (message?.includes("invalid_email")) return "Informe um e-mail válido ou deixe em branco.";
  if (message?.includes("invalid_image")) return "Envie uma imagem PNG ou JPG de até 2,5 MB.";
  return fallback;
}

export const getQrPosterSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await untypedDb(context.supabase).rpc("get_qr_poster_settings");
    if (error) throw new Error(friendly(error.message, "Não foi possível carregar o cartaz."));
    return parseQrPosterSettings(data);
  });

export const getQrPosterImage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await untypedDb(context.supabase).rpc("get_qr_poster_image");
    if (error) throw new Error(friendly(error.message, "Não foi possível carregar a imagem."));
    return { image: typeof data === "string" ? data : null };
  });

export const saveQrPosterSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => qrPosterSettingsInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: result, error } = await untypedDb(context.supabase).rpc(
      "set_qr_poster_settings",
      {
        _modo: data.mode,
        _razao_social: data.officialName,
        _titular: data.holder,
        _cnpj: data.cnpj,
        _endereco: data.address,
        _telefone: data.phone,
        _email: data.email,
      },
    );
    if (error) throw new Error(friendly(error.message, "Não foi possível salvar o cartaz."));
    return parseQrPosterSettings(result);
  });

export const saveQrPosterImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => qrPosterImageInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: result, error } = await untypedDb(context.supabase).rpc("set_qr_poster_image", {
      _imagem: data.image,
    });
    if (error) throw new Error(friendly(error.message, "Não foi possível salvar a imagem."));
    return parseQrPosterSettings(result);
  });

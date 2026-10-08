import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attributionKeySchema as attributionKey, type AttributionKey } from "@/lib/attributions";
import { untypedDb } from "@/lib/untyped-db";

export type RegistryService = {
  id: string;
  attribution: AttributionKey;
  name: string;
  active: boolean;
};

const friendly = (message: string | undefined, fallback: string) => {
  if (!message) return fallback;
  if (message.includes("forbidden"))
    return "Somente administradores podem alterar as atribuições e os serviços.";
  if (message.includes("attributions_required")) return "Selecione ao menos uma atribuição.";
  if (message.includes("service_not_found")) return "Serviço não encontrado.";
  return fallback;
};

export const getRegistryServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = untypedDb(context.supabase);
    const { data: profile } = await db
      .from("usuarios")
      .select("cartorio_id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!profile) throw new Error("Seu usuário não possui um cartório válido.");
    const [{ data: registry, error: registryError }, { data: rows, error: servicesError }] =
      await Promise.all([
        db.from("cartorios").select("atribuicoes").eq("id", profile.cartorio_id).maybeSingle(),
        db
          .from("servicos_cartorio")
          .select("id, atribuicao, nome, ativo, ordem")
          .eq("cartorio_id", profile.cartorio_id)
          .order("ordem"),
      ]);
    if (registryError || servicesError)
      throw new Error("Não foi possível carregar as atribuições do cartório.");
    const attributions = ((registry?.atribuicoes as string[] | null) ?? []) as AttributionKey[];
    const services: RegistryService[] = (rows ?? []).map((row) => ({
      id: String(row.id),
      attribution: row.atribuicao as AttributionKey,
      name: String(row.nome),
      active: row.ativo === true,
    }));
    return { attributions, services };
  });

export const setRegistryAttributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ attributions: z.array(attributionKey).min(1).max(7) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("set_registry_attributions", {
      _atribuicoes: data.attributions,
    });
    if (error) throw new Error(friendly(error.message, "Não foi possível salvar as atribuições."));
    return { ok: true };
  });

export const setRegistryServiceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ serviceId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { error } = await untypedDb(context.supabase).rpc("set_registry_service_active", {
      _servico_id: data.serviceId,
      _ativo: data.active,
    });
    if (error) throw new Error(friendly(error.message, "Não foi possível atualizar o serviço."));
    return { ok: true };
  });

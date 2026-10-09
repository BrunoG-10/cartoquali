import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePlatformOverview, type PlatformOverview } from "@/lib/platform-overview";
import { untypedDb } from "@/lib/untyped-db";

// Painel da plataforma: a RPC confere o perfil PLATFORM_ADMIN da sessão antes de ler qualquer cartório.
export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformOverview> => {
    const db = untypedDb(context.supabase);
    const { data, error } = await db.rpc("get_platform_overview", {});
    if (error) {
      if (error.message?.includes("forbidden"))
        throw new Error("Somente o administrador da plataforma pode ver este painel.");
      throw new Error("Não foi possível carregar o painel da plataforma.");
    }
    return parsePlatformOverview(data);
  });

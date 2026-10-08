import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GuideProgress } from "@/lib/auth.functions";
import { untypedDb } from "@/lib/untyped-db";

// Grava o progresso do guia do próprio usuário (a RPC deriva o usuário da sessão).
export const saveGuideProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ step: z.number().int().min(0).max(1000), completed: z.boolean().optional() })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<GuideProgress> => {
    const db = untypedDb(context.supabase);
    const { data: result, error } = await db.rpc("save_my_guide_progress", {
      _etapa: data.step,
      _concluido: data.completed ?? false,
    });
    if (error) throw new Error("Não foi possível salvar o progresso do guia.");
    const row = result as { step: number; completedAt: string | null };
    return { step: Number(row.step), completedAt: row.completedAt ?? null };
  });

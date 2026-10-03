import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { EvaluationPoint } from "@/types/cartoquali";

const pointInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, "Use 3 a 40 letras, números ou hífens."),
  surveyId: z.string().uuid(),
  status: z.enum(["Ativo", "Inativo"]),
});

type PointRow = {
  id: string;
  cartorio_id: string;
  pesquisa_id: string;
  nome: string;
  localizacao: string;
  codigo: string;
  descricao: string | null;
  status: string;
  public_slug: string;
  metodo: string;
  created_at: string;
};
function mapPoint(row: PointRow): EvaluationPoint {
  return {
    id: row.id,
    registryId: row.cartorio_id,
    surveyId: row.pesquisa_id,
    name: row.nome,
    location: row.localizacao,
    description: row.descricao ?? "",
    code: row.codigo,
    status: row.status === "ativo" ? "Ativo" : "Inativo",
    method: row.metodo,
    publicUrl: "",
    reviews: 0,
    lastReview: "Não disponível nesta etapa",
    createdAt: row.created_at.slice(0, 10),
    slug: row.public_slug,
  };
}
const columns =
  "id, cartorio_id, pesquisa_id, nome, localizacao, codigo, descricao, status, public_slug, metodo, created_at";
const managingRoles = ["PLATFORM_ADMIN", "CARTORIO_ADMIN", "GESTOR"];

async function permissions(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: profile } = await context.supabase
    .from("usuarios")
    .select("id, cartorio_id, status")
    .eq("auth_user_id", context.userId)
    .maybeSingle();
  if (!profile || profile.status !== "ativo") throw new Error("Acesso não autorizado.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id);
  return {
    profile,
    canManage: (roles ?? []).some((item: { role: string }) => managingRoles.includes(item.role)),
  };
}

export const listEvaluationPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await permissions(context);
    const [{ data: points, error }, { data: surveys, error: surveyError }] = await Promise.all([
      context.supabase.from("pontos_avaliacao").select(columns).order("nome"),
      context.supabase
        .from("pesquisas")
        .select("id, nome, status")
        .eq("status", "ativa")
        .order("nome"),
    ]);
    if (error || surveyError) throw new Error("Não foi possível carregar os pontos de avaliação.");
    return {
      points: (points ?? []).map((row) => mapPoint(row)),
      surveys: surveys ?? [],
      surveyNames: Object.fromEntries((surveys ?? []).map((survey) => [survey.id, survey.nome])),
      canManage: access.canManage,
    };
  });

export const saveEvaluationPoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pointInput.parse(input))
  .handler(async ({ context, data }) => {
    const { profile, canManage } = await permissions(context);
    if (!canManage) throw new Error("Você não possui permissão para alterar pontos de avaliação.");
    const payload = {
      nome: data.name,
      localizacao: data.location,
      descricao: data.description || null,
      codigo: data.code,
      pesquisa_id: data.surveyId,
      status: data.status === "Ativo" ? "ativo" : "inativo",
    };
    const result = data.id
      ? await context.supabase
          .from("pontos_avaliacao")
          .update(payload)
          .eq("id", data.id)
          .select(columns)
          .maybeSingle()
      : await context.supabase
          .from("pontos_avaliacao")
          .insert({
            ...payload,
            cartorio_id: profile.cartorio_id,
            public_slug: data.code.toLowerCase(),
            metodo: "link_qr_nfc",
          })
          .select(columns)
          .single();
    if (result.error) {
      if (result.error.code === "23505") throw new Error("Este código já está em uso.");
      if (result.error.code === "23503")
        throw new Error("A pesquisa selecionada não pertence ao seu cartório.");
      if (result.error.code === "42501")
        throw new Error("Você não possui permissão para alterar este ponto.");
      if (result.error.message.includes("survey_unavailable"))
        throw new Error("Selecione uma pesquisa ativa do seu cartório.");
      if (result.error.message.includes("invalid_point"))
        throw new Error("Confira o nome, código e localização informados.");
      throw new Error("Não foi possível salvar o ponto de avaliação.");
    }
    if (!result.data) throw new Error("Ponto não encontrado ou sem permissão para alteração.");
    return mapPoint(result.data);
  });

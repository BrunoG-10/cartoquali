import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const answerValue = z.union([
  z.number().int().min(1).max(5),
  z.boolean(),
  z.string().max(1000),
  z.array(z.string().max(200)).max(20),
]);

const codeSchema = z.string().trim().min(3).max(80);
const answersSchema = z.record(z.string().uuid(), answerValue).superRefine((answers, context) => {
  if (Object.keys(answers).length > 50)
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Muitas respostas foram enviadas." });
  if (new TextEncoder().encode(JSON.stringify(answers)).byteLength > 32_768)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "As respostas excedem o limite permitido.",
    });
});
export const submissionSchema = z.object({
  code: codeSchema,
  idempotencyKey: z.string().uuid(),
  submissionSession: z.string().uuid(),
  answers: answersSchema,
  contact: z.object({
    requested: z.boolean(),
    name: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(255).optional(),
  }),
  testToken: z.string().uuid().optional(),
});

export type PublicQuestion = {
  key: string;
  text: string;
  type: "stars" | "yes_no" | "scale" | "text" | "single_choice" | "multiple_choice";
  order: number;
  required: boolean;
  dimension: string;
  condition: {
    sourceQuestionId: string;
    operator: "lte" | "equals";
    value: string | number | boolean;
  } | null;
  options: Array<{ value: string; label: string }>;
};

export type PublicEvaluationContext =
  | { status: "not_found" | "inactive" | "unavailable" }
  | {
      status: "ready";
      registryName: string;
      pointName: string;
      surveyName: string;
      surveyDescription: string | null;
      settings: {
        allowContactRequest: boolean;
        thankYouMessage: string | null;
        privacyNoticeVersion: string;
      };
      questions: PublicQuestion[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseContext(value: unknown): PublicEvaluationContext {
  if (!isRecord(value)) throw new Error("Não foi possível carregar esta pesquisa.");
  const status = value["status"];
  if (status === "not_found" || status === "inactive" || status === "unavailable")
    return { status };
  if (
    status !== "ready" ||
    typeof value["registryName"] !== "string" ||
    typeof value["pointName"] !== "string" ||
    !Array.isArray(value["questions"])
  ) {
    throw new Error("Não foi possível carregar esta pesquisa.");
  }
  const questions: PublicQuestion[] = value["questions"].map((raw) => {
    if (
      !isRecord(raw) ||
      typeof raw["key"] !== "string" ||
      typeof raw["text"] !== "string" ||
      typeof raw["type"] !== "string"
    )
      throw new Error("Pesquisa inválida.");
    const allowed = [
      "stars",
      "yes_no",
      "scale",
      "text",
      "single_choice",
      "multiple_choice",
    ] as const;
    if (!allowed.includes(raw["type"] as (typeof allowed)[number]))
      throw new Error("Tipo de pergunta não suportado.");
    const options = Array.isArray(raw["options"])
      ? raw["options"].filter(isRecord).map((option) => ({
          value: String(option["value"] ?? ""),
          label: String(option["label"] ?? ""),
        }))
      : [];
    const conditionValue = raw["condition"];
    const condition =
      isRecord(conditionValue) && typeof conditionValue["sourceQuestionId"] === "string"
        ? {
            sourceQuestionId: conditionValue["sourceQuestionId"],
            operator: conditionValue["operator"] === "lte" ? ("lte" as const) : ("equals" as const),
            value: conditionValue["value"] as string | number | boolean,
          }
        : null;
    return {
      key: raw["key"],
      text: raw["text"],
      type: raw["type"] as PublicQuestion["type"],
      order: Number(raw["order"]),
      required: raw["required"] === true,
      dimension: String(raw["dimension"] ?? "general"),
      condition,
      options,
    };
  });
  const rawSettings = isRecord(value["settings"]) ? value["settings"] : {};
  return {
    status: "ready",
    registryName: value["registryName"],
    pointName: value["pointName"],
    surveyName:
      typeof value["surveyName"] === "string" ? value["surveyName"] : "Pesquisa de atendimento",
    surveyDescription:
      typeof value["surveyDescription"] === "string" ? value["surveyDescription"] : null,
    settings: {
      allowContactRequest: rawSettings["allowContactRequest"] !== false,
      thankYouMessage:
        typeof rawSettings["thankYouMessage"] === "string" ? rawSettings["thankYouMessage"] : null,
      privacyNoticeVersion:
        typeof rawSettings["privacyNoticeVersion"] === "string"
          ? rawSettings["privacyNoticeVersion"]
          : "1.0",
    },
    questions,
  };
}

export const getPublicEvaluation = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ code: codeSchema, testToken: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "private, no-store, max-age=0");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = data.testToken
      ? await supabaseAdmin.rpc("get_onboarding_test_context", { _code: data.code, _test_token: data.testToken })
      : await supabaseAdmin.rpc("get_public_evaluation_context", { _code: data.code });
    if (error) {
      console.error("[public-evaluation] context lookup failed", error.code);
      throw new Error("Não foi possível carregar esta pesquisa.");
    }
    return parseContext(result) as PublicEvaluationContext;
  });

export const submitPublicEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submissionSchema.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store, max-age=0");
    setResponseHeader("X-Content-Type-Options", "nosniff");
    const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
    const sourceBytes = new TextEncoder().encode(`${secret}:${data.submissionSession}`);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const sourceHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const response = data.testToken
      ? await supabaseAdmin.rpc("submit_onboarding_test_evaluation", { _code:data.code,_test_token:data.testToken,_idempotency_key:data.idempotencyKey,_source_hash:sourceHash,_answers:data.answers })
      : await supabaseAdmin.rpc("submit_public_evaluation", { _code:data.code,_idempotency_key:data.idempotencyKey,_source_hash:sourceHash,_answers:data.answers,_contact:data.contact });
    const { data: result, error } = response;
    if (error) {
      const safeMessages: Record<string, string> = {
        point_not_found: "Este ponto de avaliação não foi encontrado.",
        point_inactive: "Este ponto de avaliação está temporariamente indisponível.",
        survey_unavailable: "A avaliação está temporariamente indisponível.",
        rate_limited: "Muitas avaliações foram enviadas nesta sessão. Aguarde alguns minutos.",
        required_answer_missing: "Responda todas as perguntas obrigatórias.",
        invalid_contact: "Confira os dados de contato informados.",
      };
      const key = Object.keys(safeMessages).find((item) => error.message.includes(item));
      console.error("[public-evaluation] submission rejected", error.code, key ?? "validation");
      throw new Error(
        key
          ? safeMessages[key]
          : "Não foi possível registrar sua avaliação. Revise as respostas e tente novamente.",
      );
    }
    return { ok: true, duplicate: isRecord(result) && result["duplicate"] === true };
  });

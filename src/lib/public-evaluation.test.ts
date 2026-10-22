import { describe, expect, it } from "vitest";
import { parseContext, submissionSchema } from "./public-evaluation.functions";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const validSubmission = {
  code: "CQ-BAL-001",
  idempotencyKey: uuid(1),
  submissionSession: uuid(2),
  pass: `${Date.UTC(2026, 9, 21)}.${"a".repeat(64)}`,
  answers: { [uuid(10)]: 5, [uuid(11)]: true, [uuid(12)]: "Atendimento rápido" },
  contact: { requested: false },
};

describe("public submission validation", () => {
  it("accepts a well-formed anonymous submission", () => {
    expect(submissionSchema.safeParse(validSubmission).success).toBe(true);
  });

  it("rejects ratings outside 1–5", () => {
    for (const rating of [0, 6, 2.5]) {
      expect(
        submissionSchema.safeParse({ ...validSubmission, answers: { [uuid(10)]: rating } }).success,
      ).toBe(false);
    }
  });

  it("rejects answers keyed by anything other than a question UUID", () => {
    expect(
      submissionSchema.safeParse({ ...validSubmission, answers: { "1 OR 1=1": 5 } }).success,
    ).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const tooMany = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [uuid(100 + i), 5]));
    expect(submissionSchema.safeParse({ ...validSubmission, answers: tooMany }).success).toBe(
      false,
    );
    expect(
      submissionSchema.safeParse({ ...validSubmission, answers: { [uuid(10)]: "x".repeat(1001) } })
        .success,
    ).toBe(false);
  });

  it("requires idempotency and session tokens", () => {
    expect(submissionSchema.safeParse({ ...validSubmission, idempotencyKey: "abc" }).success).toBe(
      false,
    );
    expect(
      submissionSchema.safeParse({ ...validSubmission, submissionSession: undefined }).success,
    ).toBe(false);
    expect(submissionSchema.safeParse({ ...validSubmission, pass: undefined }).success).toBe(false);
  });

  it("validates optional contact email", () => {
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        contact: { requested: true, email: "nao-e-email" },
      }).success,
    ).toBe(false);
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        contact: { requested: true, consent: true, email: "pessoa@example.com" },
      }).success,
    ).toBe(true);
    // A contact request without the explicit authorization is refused by the server.
    expect(
      submissionSchema.safeParse({
        ...validSubmission,
        contact: { requested: true, email: "pessoa@example.com" },
      }).success,
    ).toBe(false);
  });
});

describe("public survey context parsing", () => {
  const ready = {
    status: "ready",
    registryName: "Cartório Modelo",
    pointName: "Balcão",
    questions: [
      {
        key: uuid(10),
        text: "Como foi?",
        type: "stars",
        order: 1,
        required: true,
        dimension: "general",
      },
    ],
  };

  it("passes through unavailable states", () => {
    for (const status of ["not_found", "inactive", "unavailable"] as const)
      expect(parseContext({ status })).toEqual({ status });
  });

  it("parses a ready survey with safe defaults", () => {
    const parsed = parseContext(ready);
    expect(parsed.status).toBe("ready");
    if (parsed.status !== "ready") return;
    expect(parsed.surveyName).toBe("Pesquisa de atendimento");
    expect(parsed.settings.allowContactRequest).toBe(true);
    expect(parsed.questions[0]).toMatchObject({
      type: "stars",
      required: true,
      options: [],
      condition: null,
    });
  });

  it("rejects unsupported question types and malformed payloads", () => {
    expect(() =>
      parseContext({ ...ready, questions: [{ ...ready.questions[0], type: "file_upload" }] }),
    ).toThrow();
    expect(() => parseContext({ status: "ready" })).toThrow();
    expect(() => parseContext(null)).toThrow();
  });
});

describe("service selection (QR Code único)", () => {
  const ready = {
    status: "ready",
    registryName: "Cartório Modelo",
    pointName: "Balcão",
    questions: [
      {
        key: uuid(10),
        text: "Como foi?",
        type: "stars",
        order: 1,
        required: true,
        dimension: "overall",
      },
    ],
  };

  it("accepts an optional service id or the 'other service' flag", () => {
    expect(submissionSchema.safeParse({ ...validSubmission, serviceId: uuid(50) }).success).toBe(
      true,
    );
    expect(submissionSchema.safeParse({ ...validSubmission, serviceOther: true }).success).toBe(
      true,
    );
    expect(submissionSchema.safeParse({ ...validSubmission, serviceId: "x" }).success).toBe(false);
  });

  it("defaults to no services and falls back to the trade name when the server omits them", () => {
    const parsed = parseContext(ready);
    if (parsed.status !== "ready") throw new Error("expected ready");
    expect(parsed.services).toEqual([]);
    expect(parsed.registryOfficialName).toBe("Cartório Modelo");
    expect(parsed.registryTradeName).toBe("Cartório Modelo");
  });

  it("reads the official name and the active services", () => {
    const parsed = parseContext({
      ...ready,
      registryOfficialName: "2º Tabelionato de Notas de Teresina",
      registryTradeName: "Cartório Modelo",
      services: [{ id: uuid(50), name: "Escritura", attribution: "notas" }, { bad: true }],
    });
    if (parsed.status !== "ready") throw new Error("expected ready");
    expect(parsed.registryOfficialName).toBe("2º Tabelionato de Notas de Teresina");
    expect(parsed.services).toEqual([{ id: uuid(50), name: "Escritura", attribution: "notas" }]);
  });
});

import { describe, expect, it } from "vitest";
import {
  PASS_MAX_AGE_MS,
  PASS_MIN_AGE_MS,
  checkEvaluationPass,
  issueEvaluationPass,
  issueGoogleClickToken,
  readGoogleClickToken,
} from "./evaluation-pass";

const secret = "test-secret";
const issuedAt = Date.UTC(2026, 9, 21, 15, 0, 0);

describe("evaluation pass", () => {
  it("accepts a pass for the same code after the minimum time", async () => {
    const pass = await issueEvaluationPass(secret, "CQ-BAL-001", issuedAt);
    expect(await checkEvaluationPass(secret, "CQ-BAL-001", pass, issuedAt + 30_000)).toBe("ok");
    // The public code is case-insensitive in the URL.
    expect(await checkEvaluationPass(secret, "cq-bal-001", pass, issuedAt + 30_000)).toBe("ok");
  });

  it("rejects submissions sent faster than a person could answer", async () => {
    const pass = await issueEvaluationPass(secret, "CQ-BAL-001", issuedAt);
    expect(
      await checkEvaluationPass(secret, "CQ-BAL-001", pass, issuedAt + PASS_MIN_AGE_MS - 1),
    ).toBe("too_fast");
  });

  it("rejects an expired pass", async () => {
    const pass = await issueEvaluationPass(secret, "CQ-BAL-001", issuedAt);
    expect(
      await checkEvaluationPass(secret, "CQ-BAL-001", pass, issuedAt + PASS_MAX_AGE_MS + 1),
    ).toBe("expired");
  });

  it("rejects forged, tampered or reused-for-another-code passes", async () => {
    const pass = await issueEvaluationPass(secret, "CQ-BAL-001", issuedAt);
    const later = issuedAt + 30_000;
    expect(await checkEvaluationPass(secret, "OUTRO-CODIGO", pass, later)).toBe("invalid");
    expect(await checkEvaluationPass("other-secret", "CQ-BAL-001", pass, later)).toBe("invalid");
    const tampered = `${issuedAt - 60_000}.${pass.split(".")[1]}`;
    expect(await checkEvaluationPass(secret, "CQ-BAL-001", tampered, later)).toBe("invalid");
    expect(await checkEvaluationPass(secret, "CQ-BAL-001", "qualquer-coisa", later)).toBe(
      "invalid",
    );
  });
});

describe("google click token", () => {
  const evaluationId = "00000000-0000-4000-8000-000000000123";

  it("round-trips the evaluation id", async () => {
    const token = await issueGoogleClickToken(secret, evaluationId);
    expect(await readGoogleClickToken(secret, token)).toBe(evaluationId);
  });

  it("rejects tokens for another evaluation, another secret or garbage", async () => {
    const token = await issueGoogleClickToken(secret, evaluationId);
    const other = token.replace("123.", "124.");
    expect(await readGoogleClickToken(secret, other)).toBeNull();
    expect(await readGoogleClickToken("other-secret", token)).toBeNull();
    expect(await readGoogleClickToken(secret, "qualquer-coisa")).toBeNull();
  });
});

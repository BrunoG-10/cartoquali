import { describe, expect, it } from "vitest";
import { recoveryLinkError } from "./recovery-link";

describe("recoveryLinkError", () => {
  it("returns null for a normal recovery link or a cleaned URL", () => {
    expect(recoveryLinkError("#access_token=x&type=recovery", "")).toBeNull();
    expect(recoveryLinkError("", "")).toBeNull();
  });

  it("detects an expired link from the hash", () => {
    expect(
      recoveryLinkError(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
        "",
      ),
    ).toBe("expired");
  });

  it("detects errors sent in the query string", () => {
    expect(recoveryLinkError("", "?error=access_denied&error_code=otp_expired")).toBe("expired");
    expect(recoveryLinkError("", "?error=server_error")).toBe("invalid");
  });
});

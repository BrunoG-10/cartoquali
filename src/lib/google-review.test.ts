import { describe, expect, it } from "vitest";
import {
  INVITE_QUIET_DAYS,
  googleReviewUrl,
  inviteStorageKey,
  rememberInvite,
  wasInvitedRecently,
} from "./google-review";

const memory = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};
const day = 24 * 60 * 60 * 1000;
const placeId = "ChIJ-abc_123456";

describe("google review invite", () => {
  it("builds the Google write-review link for the place", () => {
    expect(googleReviewUrl(placeId)).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJ-abc_123456",
    );
  });

  it("stays quiet for 90 days on the same device after an answer", () => {
    const storage = memory();
    const now = Date.UTC(2026, 9, 30);
    expect(wasInvitedRecently(placeId, now, storage)).toBe(false);
    rememberInvite(placeId, now, storage);
    expect(storage.getItem(inviteStorageKey(placeId))).toBe(String(now));
    expect(wasInvitedRecently(placeId, now + (INVITE_QUIET_DAYS - 1) * day, storage)).toBe(true);
    expect(wasInvitedRecently(placeId, now + INVITE_QUIET_DAYS * day, storage)).toBe(false);
    expect(wasInvitedRecently("ChIJ-outro-cartorio", now, storage)).toBe(false);
  });

  it("never throws when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(wasInvitedRecently(placeId, Date.now(), blocked)).toBe(false);
    expect(() => rememberInvite(placeId, Date.now(), blocked)).not.toThrow();
    expect(wasInvitedRecently(placeId, Date.now(), null)).toBe(false);
  });
});

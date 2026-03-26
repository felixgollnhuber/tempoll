import { describe, expect, it } from "vitest";

import {
  buildManageKey,
  buildParticipantCookieValue,
  normalizeName,
  normalizeNameKey,
  parseManageKey,
  parseParticipantCookieValue,
  slugifyTitle,
} from "./tokens";

describe("token and identity helpers", () => {
  it("normalizes participant names consistently", () => {
    expect(normalizeName("  Nora   Product   ")).toBe("Nora Product");
    expect(normalizeNameKey("  Nora   Product   ")).toBe("nora product");
  });

  it("round-trips manage and participant session keys", () => {
    const manageKey = buildManageKey("event_123", "secret-token");
    expect(parseManageKey(manageKey)).toEqual({
      eventId: "event_123",
      token: "secret-token",
    });

    const cookie = buildParticipantCookieValue("participant_123", "edit-token");
    expect(parseParticipantCookieValue(cookie)).toEqual({
      participantId: "participant_123",
      token: "edit-token",
    });
  });

  it("creates readable slugs from titles", () => {
    expect(slugifyTitle("Thursday Design Review!")).toBe("thursday-design-review");
  });
});

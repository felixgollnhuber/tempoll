import { describe, expect, it } from "vitest";

import {
  defaultCreateEventDefaults,
} from "./create-event-defaults";

describe("create event defaults", () => {
  it("exposes fixed create-event defaults", () => {
    expect(defaultCreateEventDefaults).toEqual({
      dayStartMinutes: 9 * 60,
      dayEndMinutes: 18 * 60,
      slotMinutes: 60,
    });
  });
});

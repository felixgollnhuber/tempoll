import { beforeEach, describe, expect, it } from "vitest";

import {
  defaultCreateEventDefaults,
  readCreateEventDefaults,
  saveCreateEventDefaults,
} from "./create-event-defaults";

describe("create event defaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the built-in defaults when nothing has been stored yet", () => {
    expect(readCreateEventDefaults()).toEqual(defaultCreateEventDefaults);
  });

  it("reads previously saved defaults from browser storage", () => {
    saveCreateEventDefaults({
      dayStartMinutes: 8 * 60,
      dayEndMinutes: 17 * 60,
      slotMinutes: 15,
    });

    expect(readCreateEventDefaults()).toEqual({
      dayStartMinutes: 8 * 60,
      dayEndMinutes: 17 * 60,
      slotMinutes: 15,
    });
  });

  it("falls back to the built-in defaults when stored data is invalid", () => {
    window.localStorage.setItem(
      "tempoll_create_event_defaults",
      JSON.stringify({
        dayStartMinutes: 18 * 60,
        dayEndMinutes: 9 * 60,
        slotMinutes: 999,
      }),
    );

    expect(readCreateEventDefaults()).toEqual(defaultCreateEventDefaults);
  });
});

import { describe, expect, it } from "vitest";

import { buildTimezoneOptions } from "./timezone-options";

describe("timezone options", () => {
  it("sorts timezone options by GMT offset and then alphabetically", () => {
    const options = buildTimezoneOptions(
      ["Europe/Vienna", "UTC", "America/New_York", "Europe/Berlin"],
      "2026-03-30",
    );

    expect(options.map((option) => option.value)).toEqual([
      "America/New_York",
      "UTC",
      "Europe/Berlin",
      "Europe/Vienna",
    ]);
    expect(options.map((option) => option.label)).toEqual([
      "(GMT-4) America/New_York",
      "(GMT+0) UTC",
      "(GMT+2) Europe/Berlin",
      "(GMT+2) Europe/Vienna",
    ]);
  });

  it("uses the reference date to reflect daylight-saving offsets", () => {
    expect(buildTimezoneOptions(["Europe/Vienna"], "2026-01-15")[0]).toMatchObject({
      value: "Europe/Vienna",
      offsetMinutes: 60,
      label: "(GMT+1) Europe/Vienna",
    });

    expect(buildTimezoneOptions(["Europe/Vienna"], "2026-07-15")[0]).toMatchObject({
      value: "Europe/Vienna",
      offsetMinutes: 120,
      label: "(GMT+2) Europe/Vienna",
    });
  });
});

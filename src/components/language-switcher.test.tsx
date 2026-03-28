import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LanguageSwitcher } from "./language-switcher";
import { renderWithI18n } from "@/test/render-with-i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("LanguageSwitcher", () => {
  it("wraps the mobile icon variant in a single direct span inside the trigger", () => {
    renderWithI18n(<LanguageSwitcher mobileIcon />, { locale: "de" });

    const trigger = screen.getByRole("combobox", { name: "Sprache" });
    const directSpans = Array.from(trigger.children).filter((child) => child.tagName === "SPAN");

    expect(directSpans).toHaveLength(1);
    expect(trigger.querySelector("svg")).not.toBeNull();
  });
});

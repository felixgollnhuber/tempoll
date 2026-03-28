import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppChrome } from "./app-chrome";
import { renderWithI18n } from "@/test/render-with-i18n";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("AppChrome", () => {
  it("renders the default logo when one is configured", () => {
    renderWithI18n(
      <AppChrome
        appName="tempoll"
        logoSrc="/tempoll-logo.png"
        setupComplete
        legalPagesEnabled={false}
      >
        <div>content</div>
      </AppChrome>,
    );

    expect(screen.getByAltText("tempoll")).toHaveAttribute("src", "/tempoll-logo.png");
  });

  it("falls back to the app name when no logo is configured", () => {
    renderWithI18n(
      <AppChrome appName="tempoll" setupComplete legalPagesEnabled={false}>
        <div>content</div>
      </AppChrome>,
    );

    expect(screen.getByRole("link", { name: "tempoll" })).toHaveTextContent("tempoll");
  });

  it("falls back to the app name when the logo cannot be loaded", () => {
    renderWithI18n(
      <AppChrome
        appName="tempoll"
        logoSrc="/tempoll-logo.png"
        setupComplete
        legalPagesEnabled={false}
      >
        <div>content</div>
      </AppChrome>,
    );

    fireEvent.error(screen.getByAltText("tempoll"));

    expect(screen.queryByAltText("tempoll")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tempoll" })).toHaveTextContent("tempoll");
  });

  it("shows a new logo again after a previous logo failed", () => {
    const { rerender } = renderWithI18n(
      <AppChrome
        appName="tempoll"
        logoSrc="/tempoll-logo.png"
        setupComplete
        legalPagesEnabled={false}
      >
        <div>content</div>
      </AppChrome>,
    );

    fireEvent.error(screen.getByAltText("tempoll"));

    rerender(
      <AppChrome
        appName="tempoll"
        logoSrc="/tempoll-logo-2.png"
        setupComplete
        legalPagesEnabled={false}
      >
        <div>content</div>
      </AppChrome>,
    );

    expect(screen.getByAltText("tempoll")).toHaveAttribute("src", "/tempoll-logo-2.png");
  });
});

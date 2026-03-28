import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppChrome } from "./app-chrome";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppChrome", () => {
  it("renders the default logo when one is configured", () => {
    render(
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
    render(
      <AppChrome appName="tempoll" setupComplete legalPagesEnabled={false}>
        <div>content</div>
      </AppChrome>,
    );

    expect(screen.getByRole("link", { name: "tempoll" })).toHaveTextContent("tempoll");
  });

  it("falls back to the app name when the logo cannot be loaded", () => {
    render(
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
    const { rerender } = render(
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

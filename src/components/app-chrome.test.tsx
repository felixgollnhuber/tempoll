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

  it("keeps compact header controls accessible via full labels", () => {
    renderWithI18n(
      <AppChrome appName="tempoll" setupComplete legalPagesEnabled={false}>
        <div>content</div>
      </AppChrome>,
      { locale: "de" },
    );

    expect(screen.getByRole("combobox", { name: "Sprache" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neues Event" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Letzte Events" })).toBeInTheDocument();
  });

  it("renders GitHub open source and issue links in the footer instead of mailto", () => {
    renderWithI18n(
      <AppChrome appName="tempoll" setupComplete legalPagesEnabled={false}>
        <div>content</div>
      </AppChrome>,
    );

    const repositoryLink = screen.getByRole("link", { name: "Open source on GitHub" });
    const issuesLink = screen.getByRole("link", { name: "Open an issue on GitHub" });

    expect(repositoryLink).toHaveAttribute(
      "href",
      "https://github.com/felixgollnhuber/tempoll",
    );
    expect(repositoryLink).toHaveAttribute("target", "_blank");
    expect(repositoryLink).toHaveAttribute("rel", "noreferrer");

    expect(issuesLink).toHaveAttribute(
      "href",
      "https://github.com/felixgollnhuber/tempoll/issues",
    );
    expect(issuesLink).toHaveAttribute("target", "_blank");
    expect(issuesLink).toHaveAttribute("rel", "noreferrer");

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

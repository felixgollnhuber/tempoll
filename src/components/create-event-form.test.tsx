import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateEventForm } from "./create-event-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("CreateEventForm", () => {
  it("shows a friendly inline title validation message before submitting", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    render(
      <CreateEventForm
        timezones={["Europe/Vienna"]}
        timeOptions={[
          { value: 9 * 60, label: "09:00" },
          { value: 18 * 60, label: "18:00" },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Event title"), {
      target: { value: "ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    const titleInput = screen.getByLabelText("Event title");

    expect(
      screen.getByText("Event title must be at least 3 characters long."),
    ).toBeInTheDocument();
    expect(titleInput).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the inline title validation message once the input is corrected", () => {
    render(
      <CreateEventForm
        timezones={["Europe/Vienna"]}
        timeOptions={[
          { value: 9 * 60, label: "09:00" },
          { value: 18 * 60, label: "18:00" },
        ]}
      />,
    );

    const titleInput = screen.getByLabelText("Event title");

    fireEvent.change(titleInput, {
      target: { value: "ab" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    expect(
      screen.getByText("Event title must be at least 3 characters long."),
    ).toBeInTheDocument();

    fireEvent.change(titleInput, {
      target: { value: "Sprint planning" },
    });

    expect(
      screen.queryByText("Event title must be at least 3 characters long."),
    ).not.toBeInTheDocument();
    expect(titleInput).not.toHaveAttribute("aria-invalid");
  });
});

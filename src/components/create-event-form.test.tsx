import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppLocale } from "@/lib/i18n/locale";
import { renderWithI18n } from "@/test/render-with-i18n";
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

const defaultTimezones = ["Europe/Vienna"];
const defaultTimeOptions = [
  { value: 8 * 60, label: "08:00" },
  { value: 9 * 60, label: "09:00" },
  { value: 17 * 60, label: "17:00" },
  { value: 18 * 60, label: "18:00" },
  { value: 24 * 60, label: "24:00" },
];

function renderCreateEventForm(locale: AppLocale = "en") {
  return renderWithI18n(
    <CreateEventForm timezones={defaultTimezones} timeOptions={defaultTimeOptions} />,
    { locale },
  );
}

beforeEach(() => {
  window.localStorage.clear();
  push.mockReset();
});

describe("CreateEventForm", () => {
  it("renders localized German labels when requested", () => {
    renderCreateEventForm("de");

    expect(screen.getByLabelText("Event-Titel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Event erstellen" })).toBeInTheDocument();
  });

  it("shows a friendly inline title validation message before submitting", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    renderCreateEventForm();

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
    renderCreateEventForm();

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

  it("shows daily start options immediately without requiring a daily end selection first", async () => {
    const user = userEvent.setup();

    renderCreateEventForm();

    await user.click(screen.getByRole("combobox", { name: "Daily start" }));

    expect(screen.getByRole("option", { name: "08:00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "17:00" })).toBeInTheDocument();
  });

  it("submits selected daily window and slot size after a successful event creation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        manageKey: "manage-key-123",
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    renderCreateEventForm();

    await user.type(screen.getByLabelText("Event title"), "Sprint planning");

    await user.click(screen.getByRole("combobox", { name: "Daily start" }));
    await user.click(screen.getByRole("option", { name: "08:00" }));

    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    await user.click(screen.getByRole("option", { name: "17:00" }));

    await user.click(screen.getByRole("combobox", { name: "Slot size" }));
    await user.click(screen.getByRole("option", { name: "15 min" }));

    await user.click(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/manage/manage-key-123");
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body)) as {
      dayStartMinutes: number;
      dayEndMinutes: number;
      slotMinutes: number;
    };

    expect(payload).toMatchObject({
      dayStartMinutes: 8 * 60,
      dayEndMinutes: 17 * 60,
      slotMinutes: 15,
    });
  });

  it("offers meeting durations up to 6 hours", async () => {
    const user = userEvent.setup();

    renderCreateEventForm();

    await user.click(screen.getByRole("combobox", { name: "Meeting duration" }));

    expect(screen.getByRole("option", { name: "360 min" })).toBeInTheDocument();
  });

  it("shows only daily end options that are later than the selected daily start", async () => {
    const user = userEvent.setup();

    renderCreateEventForm();

    await user.click(screen.getByRole("combobox", { name: "Daily start" }));
    await user.click(screen.getByRole("option", { name: "17:00" }));

    await user.click(screen.getByRole("combobox", { name: "Daily end" }));

    expect(screen.queryByRole("option", { name: "08:00" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "17:00" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "18:00" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "24:00" })).toBeInTheDocument();
  });

  it("allows selecting 24:00 as daily end and submits dayEndMinutes as 1440", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        manageKey: "manage-key-123",
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    renderCreateEventForm();

    await user.type(screen.getByLabelText("Event title"), "Sprint planning");

    await user.click(screen.getByRole("combobox", { name: "Daily end" }));
    expect(screen.getByRole("option", { name: "24:00" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "24:00" }));

    expect(screen.getByText("09:00 - 24:00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith("/manage/manage-key-123");
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(requestInit.body)) as {
      dayEndMinutes: number;
    };

    expect(payload.dayEndMinutes).toBe(24 * 60);
  });
});

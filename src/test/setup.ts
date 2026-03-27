import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class MockEventSource {
  addEventListener() {}

  close() {}
}

afterEach(() => {
  cleanup();
});

Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  writable: true,
  value: MockEventSource,
});

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class MockEventSource {
  addEventListener() {}

  close() {}
}

class MockResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
}

afterEach(() => {
  cleanup();
});

Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  writable: true,
  value: MockEventSource,
});

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: MockResizeObserver,
});

Object.defineProperties(HTMLElement.prototype, {
  setPointerCapture: {
    configurable: true,
    writable: true,
    value() {},
  },
  releasePointerCapture: {
    configurable: true,
    writable: true,
    value() {},
  },
  hasPointerCapture: {
    configurable: true,
    writable: true,
    value() {
      return true;
    },
  },
  scrollIntoView: {
    configurable: true,
    writable: true,
    value() {},
  },
});

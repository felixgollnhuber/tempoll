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
  localStorageStore.clear();
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

const localStorageStore = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem(key: string) {
      return localStorageStore.has(key) ? localStorageStore.get(key)! : null;
    },
    setItem(key: string, value: string) {
      localStorageStore.set(key, value);
    },
    removeItem(key: string) {
      localStorageStore.delete(key);
    },
    clear() {
      localStorageStore.clear();
    },
  },
});

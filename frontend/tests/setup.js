import { beforeEach } from "vitest";
import { assistantOpen } from "../src/config/assistantState.js";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(global, "visualViewport", {
  value: {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  configurable: true,
});

const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

if (typeof sessionStorage === "undefined" || typeof sessionStorage.clear !== "function") {
  const memory = {};
  const sessionStorageMock = {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null),
    setItem: (key, value) => {
      memory[key] = String(value);
    },
    removeItem: (key) => {
      delete memory[key];
    },
    clear: () => {
      Object.keys(memory).forEach((key) => {
        delete memory[key];
      });
    },
    key: (index) => Object.keys(memory)[index] ?? null,
    get length() {
      return Object.keys(memory).length;
    },
  };

  Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorageMock,
    configurable: true,
  });
}

beforeEach(() => {
  sessionStorage.clear();
  assistantOpen.value = false;
});

import "@testing-library/jest-dom";

// Polyfill para AbortSignal.throwIfAborted em ambientes JSDOM
if (typeof AbortSignal !== "undefined" && !(AbortSignal.prototype as any).throwIfAborted) {
  (AbortSignal.prototype as any).throwIfAborted = function () {
    if (this.aborted) {
      const err = new Error("This operation was aborted");
      err.name = "AbortError";
      throw err;
    }
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

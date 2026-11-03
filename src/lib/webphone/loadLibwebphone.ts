/**
 * Dynamically loads /libwebphone.js into the DOM once
 */

let loadPromise: Promise<void> | null = null;

export function loadLibwebphone(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is not defined"));
  }

  if (window.libwebphone) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existing = document.querySelector('script[src="/libwebphone.js"]');
    if (existing) {
      if (window.libwebphone) {
        return resolve();
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = "/libwebphone.js";
    script.async = true;
    script.onload = () => {
      if (window.libwebphone) {
        resolve();
      } else {
        reject(new Error("libwebphone script loaded but window.libwebphone not found"));
      }
    };
    script.onerror = (err) => {
      loadPromise = null;
      reject(new Error(`Falha ao carregar libwebphone.js: ${err}`));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

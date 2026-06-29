/**
 * WebContainers run a Node.js runtime inside the browser and depend on
 * `SharedArrayBuffer`, which is only available when the page is
 * cross-origin isolated. That, in practice, currently means a Chromium-based
 * desktop browser (Chrome, Edge, Brave, Arc). This helper lets the UI detect
 * unsupported environments and degrade gracefully instead of throwing.
 */
export function isWebContainerSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof SharedArrayBuffer !== "undefined" &&
    // crossOriginIsolated is required for SharedArrayBuffer to be usable.
    (window as unknown as { crossOriginIsolated?: boolean })
      .crossOriginIsolated === true
  );
}

/**
 * Returns a human-readable reason explaining why WebContainers are unavailable,
 * or null if the environment is supported.
 */
export function getUnsupportedReason(): string | null {
  if (typeof window === "undefined") return "Not running in a browser.";
  if (typeof SharedArrayBuffer === "undefined") {
    return "Your browser does not support SharedArrayBuffer, which is required to run the in-browser environment. Please use a recent Chromium-based browser (Chrome, Edge, Brave or Arc).";
  }
  if (
    !(window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated
  ) {
    return "This page is not cross-origin isolated, so the in-browser runtime cannot start. This usually resolves on a fresh reload over HTTPS.";
  }
  return null;
}

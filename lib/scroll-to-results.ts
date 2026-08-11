/** Smooth-scroll to a results anchor after the filtered list can paint. */
export function scrollToResults(anchorId?: string) {
  if (!anchorId || typeof document === "undefined") return;
  window.setTimeout(() => {
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 50);
}

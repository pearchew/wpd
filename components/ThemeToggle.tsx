"use client";

export function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    const current =
      root.dataset.theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  };
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label="Toggle light and dark mode" title="Light / dark">
      ◐
    </button>
  );
}

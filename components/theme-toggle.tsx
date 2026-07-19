"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const THEME_EVENT = "pa-theme-change";

function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/**
 * The current skin lives on <html data-theme> (set pre-paint by the head
 * script). We read it as an external store rather than mirroring it into
 * component state, and notify subscribers via a custom event on toggle.
 */
export function ThemeToggle() {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(THEME_EVENT, cb);
    return () => window.removeEventListener(THEME_EVENT, cb);
  }, []);
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("pa-theme", next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle skin (dark / light)"
      className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-muted hover:text-body"
    >
      <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
      <span className="pa-mono">{theme === "dark" ? "JP dark" : "Light"}</span>
    </button>
  );
}

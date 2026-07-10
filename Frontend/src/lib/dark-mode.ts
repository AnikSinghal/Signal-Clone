const STORAGE_KEY = "signal-dark-mode";

export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function setDarkMode(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  } catch {}
}

export function toggleDarkMode(): boolean {
  const next = !isDarkMode();
  setDarkMode(next);
  return next;
}

export function initDarkMode() {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    } catch {
      return null;
    }
  })();
  if (typeof stored === "boolean") {
    setDarkMode(stored);
  } else {
    setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
}

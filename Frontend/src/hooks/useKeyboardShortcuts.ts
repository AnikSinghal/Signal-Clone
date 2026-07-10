import { useEffect } from "react";

export type KeyboardShortcutHandlers = {
  onSearch?: () => void;
  onEscape?: () => void;
  onSendMessage?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
};

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, deps: { composerFocused: boolean; enabled?: boolean } = { composerFocused: false }) {
  const { composerFocused, enabled = true } = deps;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K = Search
      if (isMod && e.key === "k") {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        handlers.onEscape?.();
        return;
      }

      // Arrow Up/Down for conversation navigation (only when composer is not focused)
      if (!composerFocused && !isMod && !e.altKey && !e.shiftKey) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          handlers.onNavigateUp?.();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          handlers.onNavigateDown?.();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers, composerFocused, enabled]);
}

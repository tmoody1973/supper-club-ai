"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "supper-club-theme";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setTheme(readTheme());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  const nextLabel = theme === "dark" ? "Day service" : "Night service";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel.toLowerCase()}`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextLabel.toLowerCase()}`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </span>
      <span className="theme-toggle__label">{nextLabel}</span>
    </button>
  );
}

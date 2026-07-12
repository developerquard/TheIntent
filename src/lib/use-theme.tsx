import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePref = "light" | "dark" | "system";

type ThemeContextValue = {
  /** The user's stored preference. */
  theme: ThemePref;
  /** The resolved theme actually applied to the document. */
  resolved: "light" | "dark";
  setTheme: (t: ThemePref) => void;
};

const STORAGE_KEY = "sd-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Read stored preference once mounted (avoids SSR/hydration mismatch).
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemePref | null) ?? "system";
    setThemeState(stored);
  }, []);

  // Resolve + apply whenever preference or system setting changes.
  useEffect(() => {
    const compute = () => {
      const next = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
      setResolved(next);
      apply(next);
    };
    compute();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") compute();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePref) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script injected in <head> to set the theme class before paint (no flash). */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

import { createContext, useContext, useCallback } from "react";
import { useRevalidator } from "react-router";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  const revalidator = useRevalidator();

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.cookie = `atlas-theme=${next};path=/;max-age=31536000`;
    document.documentElement.setAttribute("data-theme", next);
    revalidator.revalidate();
  }, [theme, revalidator]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Read the atlas-theme cookie from a request's Cookie header. */
export function getThemeFromRequest(request: Request): Theme {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/atlas-theme=([^;]+)/);
  if (match) {
    const val = decodeURIComponent(match[1]);
    if (val === "light") return "light";
  }
  return "dark";
}

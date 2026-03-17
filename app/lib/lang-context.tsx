import { createContext, useContext, useCallback } from "react";
import { useRevalidator } from "react-router";

type Lang = "en" | "es";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
});

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  const revalidator = useRevalidator();

  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `atlas-lang=${next};path=/;max-age=31536000`;
      document.documentElement.lang = next;
      revalidator.revalidate();
    },
    [revalidator]
  );

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/** Read the atlas-lang cookie from a request's Cookie header. */
export function getLangFromRequest(request: Request): Lang {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/atlas-lang=([^;]+)/);
  if (match) {
    const val = decodeURIComponent(match[1]);
    if (val === "es") return "es";
  }
  return "en";
}

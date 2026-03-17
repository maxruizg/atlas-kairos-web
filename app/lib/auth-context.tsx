import { createContext, useContext, useCallback } from "react";
import { useRevalidator } from "react-router";

interface AuthContextValue {
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) {
  const revalidator = useRevalidator();

  const logout = useCallback(() => {
    document.cookie = "atlas-session=;path=/;max-age=0";
    revalidator.revalidate();
  }, [revalidator]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Read the atlas-session cookie from a request's Cookie header. */
export function getSessionFromRequest(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/atlas-session=([^;]+)/);
  if (match) {
    const val = decodeURIComponent(match[1]);
    if (val) return val;
  }
  return null;
}

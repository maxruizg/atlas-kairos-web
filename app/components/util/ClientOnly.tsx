import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only after hydration. Used to keep browser-only libraries
 * (e.g. the canvas force-graph, which touches `window` on import) out of the
 * SSR pass. Matches the codebase's existing `useEffect`-mount convention.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children() : fallback}</>;
}

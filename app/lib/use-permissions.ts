import { useCallback } from "react";
import { useClientData } from "~/lib/client-data-context";
import { useToast } from "~/lib/toast-context";
import { can, DENIED_MESSAGE } from "~/lib/permissions";
import type { Permission } from "~/lib/types";

/** `cn = useCan(); cn("fund.add")` — checked at render time to show/hide. */
export function useCan() {
  const { currentRole } = useClientData();
  return useCallback((perm: Permission) => can(currentRole, perm), [currentRole]);
}

/**
 * Returns a guard: `guard("fund.add", () => {...})` runs the action only if
 * the current role is permitted, otherwise shows the Spanish denial toast.
 * Use this on click handlers whose buttons can't always be hidden.
 */
export function useGuard() {
  const cn = useCan();
  const { toast } = useToast();
  return useCallback(
    (perm: Permission, action: () => void) => {
      if (cn(perm)) {
        action();
      } else {
        toast(DENIED_MESSAGE, "error");
      }
    },
    [cn, toast]
  );
}

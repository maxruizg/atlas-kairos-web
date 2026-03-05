import { createContext, useContext } from "react";
import type { Entity } from "~/lib/types";

interface EntityContextValue {
  entities: Entity[];
  selectedEntityId: string | null;
}

const EntityContext = createContext<EntityContextValue>({
  entities: [],
  selectedEntityId: null,
});

export function EntityProvider({
  entities,
  selectedEntityId,
  children,
}: {
  entities: Entity[];
  selectedEntityId: string | null;
  children: React.ReactNode;
}) {
  return (
    <EntityContext.Provider value={{ entities, selectedEntityId }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}

/** Read the atlas-entity cookie from a request's Cookie header. */
export function getEntityFromRequest(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/atlas-entity=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

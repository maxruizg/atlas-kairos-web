import { Outlet, isRouteErrorResponse, useLoaderData } from "react-router";
import { Sidebar } from "~/components/layout/Sidebar";
import { TopBar } from "~/components/layout/TopBar";
import { EntityProvider, getEntityFromRequest } from "~/lib/entity-context";
import { api } from "~/lib/api.server";
import type { Entity } from "~/lib/types";

export async function loader({ request }: { request: Request }) {
  let entities: Entity[] = [];
  try {
    entities = await api.getEntities();
  } catch {
    // Backend may not be running — degrade gracefully
  }
  const selectedEntityId = getEntityFromRequest(request);
  return { entities, selectedEntityId };
}

export default function AppLayout() {
  const { entities, selectedEntityId } = useLoaderData<{
    entities: Entity[];
    selectedEntityId: string | null;
  }>();

  return (
    <EntityProvider entities={entities} selectedEntityId={selectedEntityId}>
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <Outlet />
        </div>
        <div className="h-7 bg-atlas-surface border-t border-atlas-border flex items-center justify-center gap-2 text-[10px] text-atlas-gray3 shrink-0">
          <span>Atlas by</span>
          <span className="text-atlas-purple font-semibold">[KAIROS]</span>
          <span>&middot; v1.0 &middot; Confidential</span>
        </div>
      </div>
    </EntityProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Something went wrong loading this page.";
  if (isRouteErrorResponse(error)) {
    message = error.data?.toString() || error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-atlas-purple mb-3">Error</div>
          <div className="text-sm text-atlas-gray3 max-w-md">{message}</div>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg bg-atlas-purple text-white text-sm font-semibold no-underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

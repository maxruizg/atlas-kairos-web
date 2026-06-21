import { Suspense, lazy, useState, useMemo } from "react";
import { useRouteLoaderData } from "react-router";
import { resolveOrgId, updateFund } from "~/lib/supabase.server";
import { useEntity } from "~/lib/entity-context";
import { useMergedFunds, useMergedSponsors } from "~/lib/use-merged-data";
import { useClientData } from "~/lib/client-data-context";
import type { Organization } from "~/lib/types";
import { useT } from "~/lib/use-t";
import { ClientOnly } from "~/components/util/ClientOnly";
import { HierarchyView } from "~/components/brain/HierarchyView";

// BrainGraph imports a browser-only canvas library (react-force-graph-2d), so
// it must never load during SSR. Lazy + ClientOnly keeps it client-side only.
const BrainGraph = lazy(() => import("~/components/brain/BrainGraph"));

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "reassign-fund") {
    const fundId = String(form.get("fund_id") || "");
    const entityId = String(form.get("entity_id") || "");
    if (!fundId || !entityId)
      return { intent, ok: false, error: "Missing fund or entity id" };
    try {
      const orgId = await resolveOrgId(request);
      await updateFund(orgId, fundId, { entity_id: entityId });
      return { intent, ok: true };
    } catch (err) {
      return { intent, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { intent: "unknown", ok: false, error: "Unknown intent" };
}

type View = "brain" | "hierarchy";

export default function EntityMap() {
  const parentData = useRouteLoaderData("routes/_app") as
    | { organization?: Organization }
    | undefined;
  const orgName = parentData?.organization?.name ?? "";
  const t = useT();
  const brain = (t as any).brain;

  // Everything the Segundo Cerebro graph needs comes from the shared store, so
  // a newly-added sponsor / fund / direct appears in the graph immediately.
  const { entities } = useEntity();
  const funds = useMergedFunds();
  const sponsors = useMergedSponsors();
  const { directInvestments, documents } = useClientData();
  const data = useMemo(() => ({ entities, funds, sponsors }), [entities, funds, sponsors]);
  const allSponsors = sponsors;

  // Default to the new "Segundo Cerebro" knowledge graph.
  const [view, setView] = useState<View>("brain");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* View toggle */}
      <div className="flex items-center justify-center px-6 py-2.5 border-b border-atlas-border shrink-0">
        <div className="inline-flex rounded-full border border-atlas-border bg-atlas-surface p-0.5">
          {(["brain", "hierarchy"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                view === v
                  ? "bg-atlas-purple text-white"
                  : "bg-transparent text-atlas-gray3 hover:text-atlas-gray1"
              }`}
            >
              {v === "brain" ? brain.viewBrain : brain.viewHierarchy}
            </button>
          ))}
        </div>
      </div>

      {view === "hierarchy" ? (
        <HierarchyView data={data} orgName={orgName} />
      ) : (
        <div className="flex-1 relative">
          <ClientOnly
            fallback={
              <div className="absolute inset-0 flex items-center justify-center text-atlas-gray3 text-sm">
                {brain.loading}
              </div>
            }
          >
            {() => (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center text-atlas-gray3 text-sm">
                    {brain.loading}
                  </div>
                }
              >
                <BrainGraph
                  entities={data.entities}
                  funds={funds}
                  directInvestments={directInvestments}
                  sponsors={allSponsors}
                  documents={documents}
                  orgName={orgName}
                />
              </Suspense>
            )}
          </ClientOnly>
        </div>
      )}
    </div>
  );
}

import { Outlet, isRouteErrorResponse, useLoaderData, redirect } from "react-router";
import { Sidebar } from "~/components/layout/Sidebar";
import { TopBar } from "~/components/layout/TopBar";
import { EntityProvider, getEntityFromRequest } from "~/lib/entity-context";
import { ThemeProvider, getThemeFromRequest } from "~/lib/theme-context";
import { LangProvider, getLangFromRequest } from "~/lib/lang-context";
import { AuthProvider, getSessionFromRequest } from "~/lib/auth-context";
import { ClientDataProvider } from "~/lib/client-data-context";
import { ToastProvider } from "~/lib/toast-context";
import { DocViewerProvider } from "~/lib/doc-viewer-context";
import { useT } from "~/lib/use-t";
import { api, type UserPublic } from "~/lib/api.server";
import {
  resolveOrgId,
  listSponsors,
  listFunds,
  ensureDefaultEntity,
  listDirects,
  getTaxonomy,
  listAudit,
  listDocuments,
  listGraphMeta,
} from "~/lib/supabase.server";
import { DEFAULT_TAXONOMY } from "~/lib/taxonomy";
import type { Entity, Organization, DirectInvestment, TaxonomyLists, AuditEntry, Document, GraphNodeMeta, Fund, SponsorBase } from "~/lib/types";

export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") || undefined;

  // ── TEMP DEV PREVIEW BYPASS — remove before commit ──────────────────────
  // Renders the seeded hosted-Supabase portfolio under `npm run dev` without
  // the Rust auth backend running locally. Auto-disabled in production builds
  // (NODE_ENV === "production"), so it never affects the deployed app.
  const DEV_BYPASS = process.env.NODE_ENV !== "production";

  let user: UserPublic;
  let organization: Organization = { name: "", onboarded: false };

  if (DEV_BYPASS) {
    user = { id: "dev-preview", name: "Altavena Family Office", email: "dev@altavena.example", role: "owner" } as UserPublic;
    organization = { name: "Altavena Family Office", onboarded: true };
  } else {
    const session = getSessionFromRequest(request);
    if (!session) {
      throw redirect("/login");
    }
    // Fetch the current user (forwards the browser cookie). If `me` 401s
    // then the session is gone — bounce to login.
    const meResult = await api.getMe(cookie);
    if (!meResult.ok) {
      throw redirect("/login", {
        headers: { "Set-Cookie": "atlas-session=;path=/;max-age=0" },
      });
    }
    user = meResult.data;

    // Fetch the tenant settings — gate the rest of the app on onboarding.
    try {
      organization = await api.getOrganization(cookie);
    } catch {
      throw redirect("/onboarding");
    }
    if (!organization.onboarded) {
      throw redirect("/onboarding");
    }
  }

  const theme = getThemeFromRequest(request);
  const lang = getLangFromRequest(request);

  // Sponsors / funds / entities / directs / taxonomy / audit / documents all
  // live in Supabase now. The flaky Fly backend is out of the data hot path
  // (it only served auth above). Every read degrades to an empty default so a
  // Supabase blip renders an empty — not broken — app. Loaded once here and
  // shared through the store, so individual screens don't re-fan-out (QA #1).
  let entities: Entity[] = [];
  let sponsors: SponsorBase[] = [];
  let funds: Fund[] = [];
  let directInvestments: DirectInvestment[] = [];
  let taxonomy: TaxonomyLists = DEFAULT_TAXONOMY;
  let auditLog: AuditEntry[] = [];
  let documents: Document[] = [];
  let graphNodeMeta: GraphNodeMeta[] = [];
  try {
    const orgId = await resolveOrgId(request);
    // Guarantee at least one entity so funds/directs always have a home and the
    // Add Direct drawer is never silently blocked by an empty entity (P0 #2).
    entities = await ensureDefaultEntity(orgId, organization.name);
    [sponsors, funds, directInvestments, taxonomy, auditLog, documents, graphNodeMeta] =
      await Promise.all([
        listSponsors(orgId).catch(() => []),
        listFunds(orgId).catch(() => []),
        listDirects(orgId).catch(() => []),
        getTaxonomy(orgId).catch(() => DEFAULT_TAXONOMY),
        listAudit(orgId).catch(() => []),
        listDocuments(orgId).catch(() => []),
        listGraphMeta(orgId).catch(() => []),
      ]);
  } catch {
    // Supabase not configured / reachable — degrade to client defaults.
  }

  // Stale-cookie cleanup: if the browser carries an `atlas-entity` cookie
  // pointing at an id that no longer exists, treat it as null for this render
  // AND clear the cookie so later navigations don't re-trigger an empty filter.
  const cookieEntityId = getEntityFromRequest(request);
  const stale =
    cookieEntityId !== null && !entities.some((e) => e.id === cookieEntityId);
  const selectedEntityId = stale ? null : cookieEntityId;

  const data = {
    entities, sponsors, funds, organization, user, selectedEntityId, theme, lang,
    directInvestments, taxonomy, auditLog, documents, graphNodeMeta,
  };

  if (stale) {
    return Response.json(data, {
      headers: { "Set-Cookie": "atlas-entity=; path=/; max-age=0" },
    });
  }
  return data;
}

export default function AppLayout() {
  const {
    entities, sponsors, funds, organization, user, selectedEntityId, theme, lang,
    directInvestments, taxonomy, auditLog, documents, graphNodeMeta,
  } = useLoaderData<{
    entities: Entity[];
    sponsors: SponsorBase[];
    funds: Fund[];
    organization: Organization;
    user: UserPublic;
    selectedEntityId: string | null;
    theme: "dark" | "light";
    lang: "en" | "es";
    directInvestments: DirectInvestment[];
    taxonomy: TaxonomyLists;
    auditLog: AuditEntry[];
    documents: Document[];
    graphNodeMeta: GraphNodeMeta[];
  }>();

  return (
    <AuthProvider isAuthenticated={true}>
    <ThemeProvider theme={theme}>
    <LangProvider lang={lang}>
    <EntityProvider entities={entities} selectedEntityId={selectedEntityId}>
    <ToastProvider>
    <ClientDataProvider
      entities={entities}
      sponsors={sponsors}
      funds={funds}
      directInvestments={directInvestments}
      taxonomy={taxonomy}
      auditLog={auditLog}
      documents={documents}
      graphNodeMeta={graphNodeMeta}
    >
    <DocViewerProvider>
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <TopBar organizationName={organization.name} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <Outlet />
        </div>
        <Footer />
      </div>
    </DocViewerProvider>
    </ClientDataProvider>
    </ToastProvider>
    </EntityProvider>
    </LangProvider>
    </ThemeProvider>
    </AuthProvider>
  );
}

function Footer() {
  const t = useT();
  return (
    <div className="h-7 bg-atlas-surface border-t border-atlas-border flex items-center justify-center gap-2 text-[10px] text-atlas-gray3 shrink-0">
      <span>{t.footer.atlasBy}</span>
      <span className="text-atlas-purple font-semibold">[KAIROS]</span>
      <span>&middot; v1.0 &middot; {t.footer.confidential}</span>
    </div>
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

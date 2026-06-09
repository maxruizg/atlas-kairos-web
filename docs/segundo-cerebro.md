# Segundo Cerebro — Entity Map Knowledge Graph

> Force-directed, Obsidian-style "second brain" for the family office's entire
> alternative-investments universe. Replaces the static org tree on the Entity
> Map screen (route `/`, `_app._index.tsx`) with a living, explorable graph,
> while keeping the original tree available behind a toggle.

This document records **every change and new feature** added in this build.

---

## 1. What changed at a glance

- The Entity Map index (`/`) now has a **view toggle**: **Segundo Cerebro**
  (new force-directed graph, default) ↔ **Jerarquía** (the original SVG tree,
  unchanged behaviour).
- The graph derives entirely from existing shared app state — entities, funds,
  direct investments, sponsors, portfolio companies, documents — so anything
  added elsewhere in the app appears as a node automatically.
- Beyond the ownership hierarchy, nodes cross-link by **sponsor, theme/sector,
  geography, vintage, and strategy** (the "second brain" associative links).
- A floating **control panel** filters node/link types, scopes by entity,
  recolors by Asset Class / Risk / Performance / Entity, tunes the forces, and
  searches.
- A **side panel** turns each node into a writable "note": metrics, a
  sparkline, clickable concept chips, attached documents, **backlinks**, and a
  persisted **Notes / Thesis** field.
- Per-node **notes/thesis** and **pinned positions** persist to Supabase
  (`graph_node_meta`). Editing requires the **Analyst role or above**
  (`graph.edit` permission); Viewers explore read-only.
- Full **dark + light** support via theme tokens; **minimap**, **idle breathing
  animation**, **hover local-graph highlight**, and **context menu** included.

---

## 2. Architecture

```
_app._index.tsx            route — loader/action unchanged + view toggle
 ├─ HierarchyView           original SVG tree (extracted verbatim)
 └─ ClientOnly→lazy(BrainGraph)   client-only force graph
     ├─ buildGraph()        pure: shared state → {nodes, links}
     ├─ ForceGraph2D        react-force-graph-2d (canvas 2D, bundles d3-force)
     ├─ GraphControls       filters · link types · scope · color-by · forces · search
     ├─ NodePanel           metrics · sparkline · chips · backlinks · Notes/Thesis
     ├─ NodeContextMenu     open detail · pin/unpin · add note · hide · expand
     └─ Minimap             corner orientation canvas
```

### SSR safety
`react-force-graph-2d` touches `window` on import, so `BrainGraph` is loaded
with `React.lazy()` and only ever rendered inside
[`ClientOnly`](../app/components/util/ClientOnly.tsx). The server build splits
it into its own chunk that is never evaluated during SSR.

---

## 3. New files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260607000000_graph_node_meta.sql` | `graph_node_meta` table (notes/thesis + pin/hide + position), org-scoped, RLS-enabled, mirrors `direct_investments`. |
| `app/lib/graph/graph-types.ts` | `GraphNode`, `GraphLink`, `LinkType`, helpers. |
| `app/lib/graph/build-graph.ts` | Pure derivation of nodes + ownership/associative links + concept nodes from shared state. |
| `app/lib/graph/graph-colors.ts` | `useGraphColors()` — resolves theme tokens to concrete hex for the canvas (canvas can't read `var(--…)`). |
| `app/components/util/ClientOnly.tsx` | Hydration-gate wrapper for browser-only libraries. |
| `app/components/brain/BrainGraph.tsx` | The force graph + all interactions. |
| `app/components/brain/GraphControls.tsx` | Floating control panel. |
| `app/components/brain/NodePanel.tsx` | Right-hand "note" side panel. |
| `app/components/brain/NodeContextMenu.tsx` | Right-click menu. |
| `app/components/brain/Minimap.tsx` | Corner minimap. |
| `app/components/brain/HierarchyView.tsx` | The original tree, extracted from the route. |

## 4. Modified files

| File | Change |
|------|--------|
| `app/routes/_app._index.tsx` | Toggle between `HierarchyView` and lazy `BrainGraph`; assembles graph inputs (merged funds, directs, sponsors, documents). Loader/action unchanged. |
| `app/routes/_app.tsx` | Loader fetches `listGraphMeta(orgId)` (graceful `[]`); passes `graphNodeMeta` to `ClientDataProvider`. |
| `app/routes/api.data.tsx` | New `upsert-graph-meta` intent. |
| `app/lib/supabase.server.ts` | `listGraphMeta` + `upsertGraphMeta` (PostgREST upsert on the unique key). |
| `app/lib/client-data-context.tsx` | `graphNodeMeta` state + `getGraphMeta` / `upsertGraphMeta` (optimistic, then revalidate). |
| `app/lib/types.ts` | `GraphNodeType`, `GraphNodeMeta`; `graph.edit` added to `Permission`. |
| `app/lib/permissions.ts` | `graph.edit` granted to ceo / head_portfolio / senior_analyst / analyst (not viewer). |
| `app/lib/i18n.ts` | `brain` translation block (EN + ES). |
| `package.json` | `react-force-graph-2d` dependency. |

---

## 5. Graph model (`build-graph.ts`)

**Node types:** `root`, `entity`, `sponsor`, `fund`, `direct`, `company`,
and the concept nodes `theme`, `geo`, `vintage`, `strategy`, plus `document`.

**Node ids** (also used as `node_ref_id` for persistence):
- concrete records use their real id (`fund.id`, `direct.id`, `entity.id`);
- sponsors use `sponsor:<id>`;
- companies use `<fundId>::<CompanyName>`;
- concept nodes use `theme:Fintech`, `geo:México`, `vintage:2021`, `strategy:Buyout`;
- documents use `doc:<id>`.

**Links:**
- `ownership` (solid): root→entity, entity→fund, entity→direct, fund→company.
- `sponsor` (associative): sponsor→its funds, across entities.
- `theme` / `geo` / `vintage` / `strategy` (associative, dashed): each position
  links to the shared concept node, so every position exposed to e.g. "Fintech"
  clusters together across all entities.
- `document` (associative): doc→fund or doc→direct.

**Node weight** = NAV / valuation / aggregate → drives node radius (sqrt scale),
so big positions visually dominate. Concept weights accumulate the NAV of every
position tagged with them.

**Scope:** passing `{ scope: entityId }` prunes the graph to that entity's
subgraph plus the concept nodes it touches.

---

## 6. Colors (`graph-colors.ts`)

Because the graph renders to `<canvas>`, `fillStyle` needs real hex — it cannot
read `var(--color-atlas-*)`. `useGraphColors()` mirrors the dark/light token
blocks from `app.css` (like `chart-colors.ts`) and exposes:
- `background`, `tokens`
- `assetClass(ac)` — VC purple · PE orange · Real Assets blue · Private Credit
  cyan · Infra green
- `risk(rating)` — green / orange (yellow) / red (matches `RISK_META`)
- `performance(irr)` — IRR ramp
- `entity(id, allIds)` — stable per-entity palette
- `nodeType(type)`, `link(linkType)`
- `forNode(node, colorBy, allEntityIds)` — the active **Color By** resolver

No color literals exist anywhere else in the feature.

---

## 7. Interactions

- **Pan** (drag background), **zoom** (scroll/pinch), **drag** nodes (non-pinned
  nodes spring back; pinned nodes stay and persist their position).
- **Hover** → local-graph highlight: the node, its links and neighbors stay
  bright; everything else dims. Rich HTML tooltip with NAV/IRR/MOIC/% called.
- **Single click** → focus (center + zoom) and open the side panel.
- **Double click** → navigate to the detail page (fund / sponsor / direct).
- **Right click** → context menu: Open detail · Pin/Unpin · Add note · Expand
  neighbors · Hide.
- **Idle breathing**: nodes gently pulse; the render loop pauses when the tab is
  hidden (`pauseAnimation`/`resumeAnimation`).
- **Controls**: node-type & link-type toggles, entity scope, Color By, force
  sliders (link distance / repulsion / center gravity), search-to-fly, Reset /
  Re-center.

---

## 8. Persistence & permissions

- Notes/thesis, pin state + coordinates, and hidden flag live in
  `graph_node_meta`, one row per `(organization_id, node_ref_id, node_type)`.
- The store mutator `upsertGraphMeta` updates local state optimistically then
  POSTs `{ intent: "upsert-graph-meta", meta }` to `/api/data` and revalidates —
  identical to the direct-investments flow.
- All edits (notes, pin, hide) are gated by `useCan("graph.edit")`; denied
  attempts show the standard Spanish toast. The demo store fixes the role to
  `ceo`, so editing is enabled in the running app, but the gate is correct for
  any role.

### Applying the migration
The migration targets the **cloud** Supabase project (`SUPABASE_URL`). Apply it
via the Supabase CLI / SQL editor. If the table is missing, the loader degrades
to `[]` and the graph still renders (notes/pins simply won't persist).

---

## 9. Verification

1. `npm run typecheck` and `npm run build` — both pass; `BrainGraph` is a lazy
   client chunk and SSR builds without evaluating the canvas lib.
2. `npm run dev`, open `/`:
   - Graph settles, pans/zooms/drags; toggle to **Jerarquía** → original tree
     behaves exactly as before.
   - Toggle node/link filters, entity scope, Color By (Risk shows red/green
     clusters), force sliders, search.
   - Hover isolates the local graph; click opens the side panel; double-click
     navigates; right-click menu works.
   - With the migration applied: write a note, pin + drag a node, reload →
     persists (`graph_node_meta` row created).
   - Toggle dark/light — graph, links, panels stay legible via tokens.

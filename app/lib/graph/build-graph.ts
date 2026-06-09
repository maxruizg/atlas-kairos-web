/**
 * Segundo Cerebro — derive the knowledge graph from shared app state.
 *
 * Pure + deterministic: same inputs → same `{nodes, links}` (no Date/random),
 * so it's cheap to memoize and easy to reason about. Everything the graph
 * shows comes from here, which is why any fund/direct/entity added elsewhere
 * in the app appears as a node automatically.
 *
 * Two link families:
 *   • ownership  — the legal hierarchy: root → entity → fund → company,
 *                  entity → direct.
 *   • associative — the "second brain" cross-links that make the same node
 *                  connect across dimensions: sponsor, theme, geography,
 *                  vintage, strategy, document.
 */
import type {
  Entity,
  Fund,
  DirectInvestment,
  Sponsor,
  Document,
} from "~/lib/types";
import type { GraphData, GraphLink, GraphNode } from "./graph-types";

export interface BuildGraphInput {
  entities: Entity[];
  funds: Fund[];
  directInvestments: DirectInvestment[];
  sponsors: Sponsor[];
  documents: Document[];
  /** Family/company name for the root node. */
  orgName?: string;
}

export interface BuildGraphOptions {
  /** null/undefined = all entities; otherwise prune to a single entity subgraph. */
  scope?: string | null;
}

const ROOT_ID = "root";

const conceptId = (kind: string, value: string) => `${kind}:${value}`;
const sponsorNodeId = (id: string) => `sponsor:${id}`;
const companyNodeId = (fundId: string, name: string) => `${fundId}::${name}`;
const docNodeId = (id: string) => `doc:${id}`;

export function buildGraph(
  input: BuildGraphInput,
  options: BuildGraphOptions = {}
): GraphData {
  const { entities, funds, directInvestments, sponsors, documents, orgName } = input;
  const scope = options.scope ?? null;

  const sponsorById = new Map(sponsors.map((s) => [s.id, s]));

  // Scope filter: which entities are in play.
  const scopedEntities = scope ? entities.filter((e) => e.id === scope) : entities;
  const entityIds = new Set(scopedEntities.map((e) => e.id));
  const scopedFunds = funds.filter((f) => entityIds.has(f.entity_id));
  const scopedDirects = directInvestments.filter((d) => entityIds.has(d.entity_id));

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const seen = new Set<string>();

  const addNode = (n: GraphNode) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    nodes.push(n);
  };
  const link = (source: string, target: string, linkType: GraphLink["linkType"]) => {
    links.push({ source, target, linkType });
  };

  // Concept-node accumulators: id → running weight + a creator.
  const concepts = new Map<string, { node: GraphNode }>();
  const ensureConcept = (
    kind: "theme" | "geo" | "vintage" | "strategy",
    value: string,
    label: string,
    weight: number
  ) => {
    const id = conceptId(kind, value);
    const existing = concepts.get(id);
    if (existing) {
      existing.node.weight += weight;
      return id;
    }
    const node: GraphNode = {
      id,
      type: kind,
      label,
      sub: "Concepto",
      weight: Math.max(weight, 1),
    };
    concepts.set(id, { node });
    return id;
  };

  // ── Root ────────────────────────────────────────────────────────────────
  const rootWeight = scopedEntities.reduce((s, e) => s + (e.nav || 0), 0);
  addNode({
    id: ROOT_ID,
    type: "root",
    label: orgName || "Familia",
    sub: "Family Office Group",
    weight: rootWeight || 1,
  });

  // ── Entities ──────────────────────────────────────────────────────────────
  for (const e of scopedEntities) {
    addNode({
      id: e.id,
      type: "entity",
      label: e.short || e.name,
      sub: e.name,
      weight: e.nav || 1,
      nav: e.nav,
      entityId: e.id,
    });
    link(ROOT_ID, e.id, "ownership");
  }

  // ── Funds (+ their companies, sponsor/theme/geo/vintage/strategy links) ────
  const usedSponsors = new Set<string>();
  for (const f of scopedFunds) {
    const sp = sponsorById.get(f.sponsor_id);
    addNode({
      id: f.id,
      type: "fund",
      label: f.name,
      sub: f.asset_class,
      weight: f.nav || 1,
      assetClass: f.asset_class,
      riskRating: f.risk_rating ?? null,
      irr: f.net_irr,
      moic: f.net_moic,
      nav: f.nav,
      pctCalled: f.pct_called,
      entityId: f.entity_id,
      sponsorColor: sp?.color,
      href: `/sponsors/${f.sponsor_id}/${f.id}`,
    });
    link(f.entity_id, f.id, "ownership");

    // Sponsor node + sponsor link (associative — spans entities).
    if (sp) {
      if (!usedSponsors.has(sp.id)) {
        usedSponsors.add(sp.id);
        addNode({
          id: sponsorNodeId(sp.id),
          type: "sponsor",
          label: sp.name,
          sub: sp.country,
          weight: sp.total_nav || f.nav || 1,
          sponsorColor: sp.color,
          irr: sp.net_irr,
          href: `/sponsors/${sp.id}`,
        });
      }
      link(sponsorNodeId(sp.id), f.id, "sponsor");
    }

    // Theme / geo / vintage / strategy concept links.
    if (f.sub_theme) link(f.id, ensureConcept("theme", f.sub_theme, f.sub_theme, f.nav || 0), "theme");
    if (f.geography) link(f.id, ensureConcept("geo", f.geography, f.geography, f.nav || 0), "geo");
    if (f.vintage) {
      const v = String(f.vintage);
      link(f.id, ensureConcept("vintage", v, v, f.nav || 0), "vintage");
    }
    if (f.strategy) link(f.id, ensureConcept("strategy", f.strategy, f.strategy, f.nav || 0), "strategy");

    // Portfolio companies (leaf nodes), themed by their own sector.
    for (const co of f.companies || []) {
      const cid = companyNodeId(f.id, co.name);
      addNode({
        id: cid,
        type: "company",
        label: co.name,
        sub: co.theme || co.stage || "",
        weight: Math.max(co.fmv || 0, 1),
        moic: co.moic,
        irr: co.irr,
        nav: co.fmv,
        entityId: f.entity_id,
        sponsorColor: sp?.color,
      });
      link(f.id, cid, "ownership");
      if (co.theme) link(cid, ensureConcept("theme", co.theme, co.theme, co.fmv || 0), "theme");
    }
  }

  // ── Direct investments (distinct node kind) ────────────────────────────────
  for (const d of scopedDirects) {
    addNode({
      id: d.id,
      type: "direct",
      label: d.name,
      sub: d.asset_class,
      weight: d.valuation || 1,
      assetClass: d.asset_class,
      riskRating: d.risk_rating ?? null,
      irr: d.net_irr ?? null,
      moic: d.cost > 0 ? d.valuation / d.cost : null,
      nav: d.valuation,
      entityId: d.entity_id,
      href: `/directs/${d.id}`,
    });
    link(d.entity_id, d.id, "ownership");

    if (d.sector) link(d.id, ensureConcept("theme", d.sector, d.sector, d.valuation || 0), "theme");
    if (d.geography) link(d.id, ensureConcept("geo", d.geography, d.geography, d.valuation || 0), "geo");
    if (d.investment_date) {
      const v = d.investment_date.slice(0, 4);
      if (v) link(d.id, ensureConcept("vintage", v, v, d.valuation || 0), "vintage");
    }
    if (d.stage) link(d.id, ensureConcept("strategy", d.stage, d.stage, d.valuation || 0), "strategy");
  }

  // Materialise concept nodes once their weights are final.
  for (const { node } of concepts.values()) addNode(node);

  // ── Documents (optional small nodes attached to fund / direct) ─────────────
  const present = seen; // node ids already added
  for (const doc of documents) {
    const targetId =
      (doc.fund_id && present.has(doc.fund_id) && doc.fund_id) ||
      (doc.direct_id && present.has(doc.direct_id) && doc.direct_id) ||
      null;
    if (!targetId) continue; // only show docs that attach to a visible node
    const id = docNodeId(doc.id);
    addNode({
      id,
      type: "document",
      label: doc.name,
      sub: doc.doc_type || "Documento",
      weight: 1,
      href: undefined,
    });
    link(targetId, id, "document");
  }

  return { nodes, links };
}

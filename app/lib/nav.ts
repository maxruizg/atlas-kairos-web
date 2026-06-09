/**
 * Centralised route-path builders so every "clickable" reference across the
 * app links to the same canonical detail / filtered view. Keep these in sync
 * with `app/routes.ts`.
 */

export const sponsorPath = (sponsorId: string) => `/sponsors/${encodeURIComponent(sponsorId)}`;

export const fundPath = (sponsorId: string, fundId: string) =>
  `/sponsors/${encodeURIComponent(sponsorId)}/${encodeURIComponent(fundId)}`;

export const directPath = (id: string) => `/directs/${encodeURIComponent(id)}`;

/** Settings hosts the entity list. */
export const entityPath = (entityId?: string) =>
  entityId ? `/settings?entity=${encodeURIComponent(entityId)}` : `/settings`;

/** Vault filtered by document status. */
export const vaultFilter = (status?: string) =>
  status && status !== "all" ? `/vault?status=${encodeURIComponent(status)}` : `/vault`;

/** Metrics screen, optionally focused on a fund. */
export const metricsFilter = (fundId?: string) =>
  fundId ? `/metrics?fund=${encodeURIComponent(fundId)}` : `/metrics`;

/** Sponsors index filtered by asset class (read by the sponsors loader). */
export const assetClassFilter = (assetClass: string) =>
  `/sponsors?ac=${encodeURIComponent(assetClass)}`;

/** Metrics filtered by sub-theme / theme. */
export const themeFilter = (theme: string) => `/metrics?theme=${encodeURIComponent(theme)}`;

/** Audit ledger jumped to a specific entry. */
export const ledgerEntry = (entryId: string) => `/ledger?entry=${encodeURIComponent(entryId)}`;

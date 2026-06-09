import type { Permission, RoleId } from "~/lib/types";

export interface RoleDef {
  id: RoleId;
  label: string;
  blurb: string;
}

/** The 5 tiers, ordered most → least privileged. */
export const ROLES: RoleDef[] = [
  { id: "ceo", label: "CEO / Owner", blurb: "Control total" },
  { id: "head_portfolio", label: "Head of Portfolio", blurb: "Operación completa, sin gestión de usuarios" },
  { id: "senior_analyst", label: "Senior Analyst", blurb: "Crear y editar, eliminación limitada" },
  { id: "analyst", label: "Analyst", blurb: "Solo captura de datos" },
  { id: "viewer", label: "Viewer / LP", blurb: "Solo lectura" },
];

export const ALL_PERMISSIONS: Permission[] = [
  "fund.add", "fund.edit", "fund.delete",
  "direct.add", "direct.edit", "direct.delete",
  "entity.add", "entity.edit", "entity.delete",
  "kyc.edit", "company.add", "transaction.add", "valuation.update",
  "document.upload", "document.approve",
  "taxonomy.add", "taxonomy.manage",
  "users.manage", "export", "ledger.view", "kyc.view",
  "graph.edit",
];

/**
 * Permission matrix. A role's grant is the explicit set below. CEO gets
 * everything. Lower tiers are progressively narrower per the spec.
 */
const MATRIX: Record<RoleId, Permission[]> = {
  ceo: [...ALL_PERMISSIONS],

  head_portfolio: [
    "fund.add", "fund.edit", "fund.delete",
    "direct.add", "direct.edit", "direct.delete",
    "entity.add", "entity.edit", "kyc.edit", "kyc.view",
    "company.add", "transaction.add", "valuation.update",
    "document.upload", "document.approve",
    "taxonomy.add", "taxonomy.manage",
    "export", "ledger.view",
    "graph.edit",
  ],

  senior_analyst: [
    "fund.add", "fund.edit",
    "direct.add", "direct.edit",
    "company.add", "transaction.add", "valuation.update",
    "document.upload", "document.approve",
    "taxonomy.add",
    "export", "ledger.view", "kyc.view",
    "graph.edit",
  ],

  analyst: [
    "document.upload", "transaction.add", "valuation.update",
    "graph.edit",
  ],

  viewer: [],
};

/** True if `role` is granted `perm`. */
export function can(role: RoleId, perm: Permission): boolean {
  return MATRIX[role]?.includes(perm) ?? false;
}

export function roleLabel(role: RoleId): string {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}

/** Spanish denial message shown when a gated action is attempted. */
export const DENIED_MESSAGE =
  "No tienes permisos para esta acción. Contacta a tu administrador.";

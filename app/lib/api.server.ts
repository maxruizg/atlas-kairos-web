import type { Entity, Sponsor, Fund, Organization, PortfolioCompany } from "~/lib/types";

export const API_BASE =
  process.env.API_URL || "https://app-ancient-smoke-7925.fly.dev/api/v1";

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Response(`API error: ${res.statusText}`, { status: res.status });
  }
  return res.json();
}

/**
 * Discriminated-union result for endpoints whose validation errors must
 * surface as inline UI messages rather than route-level throws.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

async function fetchApiResult<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (res.ok) {
    // 204 No Content — nothing to parse.
    if (res.status === 204) return { ok: true, data: undefined as T };
    return { ok: true, data: (await res.json()) as T };
  }
  // Best-effort parse of the structured error envelope from the backend.
  let error = res.statusText || "Request failed";
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") error = body.error;
  } catch {
    // Non-JSON body — fall back to statusText.
  }
  return { ok: false, status: res.status, error };
}

export const api = {
  // Legacy portfolio endpoints
  getKpis: () => fetchApi<any[]>("/portfolio/kpis"),
  getInvestments: (filter?: string) =>
    fetchApi<any[]>(`/portfolio/investments${filter ? `?filter=${filter}` : ""}`),
  getThemes: () => fetchApi<any[]>("/portfolio/themes"),

  // Documents
  getDocuments: (status?: string) =>
    fetchApi<any[]>(`/documents${status ? `?status=${status}` : ""}`),
  updateDocumentStatus: (id: string, status: string) =>
    fetchApi<any>(`/documents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Review
  getReview: (documentId: string) => fetchApi<any>(`/review/${documentId}`),
  approveField: (documentId: string, fieldId: string, approved: boolean) =>
    fetchApi<any>(`/review/${documentId}/fields/${fieldId}`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),

  // Copilot
  getCopilotHistory: () => fetchApi<any[]>("/copilot/history"),
  getCopilotSuggestions: () => fetchApi<any[]>("/copilot/suggestions"),
  submitCopilotQuery: (query: string) =>
    fetchApi<any>("/copilot/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  // Upload
  uploadDocument: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Response(`API error: ${res.statusText}`, { status: res.status });
    }
    return res.json();
  },

  // Organization (tenant settings + onboarding flag)
  getOrganization: (cookie?: string) =>
    fetchApi<Organization>("/organization", {
      headers: cookie ? { Cookie: cookie } : undefined,
    }),
  updateOrganization: (payload: Partial<Organization>, cookie?: string) =>
    fetchApiResult<Organization>("/organization", {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: cookie ? { Cookie: cookie } : undefined,
    }),

  // Phase 1 — new endpoints
  getEntities: (cookie?: string) =>
    fetchApi<Entity[]>("/entities", {
      headers: cookie ? { Cookie: cookie } : undefined,
    }),
  createEntity: (payload: Partial<Entity>) =>
    fetchApiResult<Entity>("/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEntity: (id: string, payload: Partial<Entity>) =>
    fetchApiResult<Entity>(`/entities/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEntity: (id: string) =>
    fetchApiResult<void>(`/entities/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  createSponsor: (payload: {
    name: string;
    initials: string;
    country: string;
    color: string;
  }) =>
    fetchApiResult<Sponsor>("/sponsors", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteSponsor: (id: string) =>
    fetchApiResult<void>(`/sponsors/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  createFund: (payload: Partial<Fund>) =>
    fetchApiResult<Fund>("/funds", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteFund: (id: string) =>
    fetchApiResult<void>(`/funds/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  updateFundEntity: (id: string, entityId: string) =>
    fetchApiResult<Fund>(`/funds/${encodeURIComponent(id)}/entity`, {
      method: "PATCH",
      body: JSON.stringify({ entity_id: entityId }),
    }),

  createCompany: (fundId: string, payload: PortfolioCompany) =>
    fetchApiResult<PortfolioCompany>(
      `/funds/${encodeURIComponent(fundId)}/companies`,
      { method: "POST", body: JSON.stringify(payload) }
    ),
  deleteCompany: (fundId: string, name: string) =>
    fetchApiResult<void>(
      `/funds/${encodeURIComponent(fundId)}/companies/${encodeURIComponent(name)}`,
      { method: "DELETE" }
    ),
  getSponsors: (entityId?: string) =>
    fetchApi<Sponsor[]>(`/sponsors${entityId ? `?entity=${entityId}` : ""}`),
  getSponsor: (id: string) => fetchApi<Sponsor>(`/sponsors/${id}`),
  getFunds: (entityId?: string, sponsorId?: string) => {
    const params = new URLSearchParams();
    if (entityId) params.set("entity", entityId);
    if (sponsorId) params.set("sponsor", sponsorId);
    const qs = params.toString();
    return fetchApi<Fund[]>(`/funds${qs ? `?${qs}` : ""}`);
  },
  getFund: (id: string) => fetchApi<Fund>(`/funds/${id}`),

  // Auth — these intentionally bypass the api wrapper because the
  // calling action needs the raw Response back to extract Set-Cookie.
  // Use the helpers below in routes/login.tsx and routes/signup.tsx.

  /** Authenticated `/auth/me` lookup. Pass the incoming request's
   *  Cookie header so the backend can identify the session. */
  getMe: (cookie?: string) =>
    fetchApiResult<UserPublic>("/auth/me", {
      headers: cookie ? { Cookie: cookie } : undefined,
    }),
};

/** POST /auth/signup — returns the raw `Response` so the caller can
 *  forward the backend's `Set-Cookie` header to the browser. */
export function rawSignup(payload: {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  organization_name?: string;
}): Promise<Response> {
  return fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST /auth/login — returns the raw `Response` so the caller can
 *  forward the backend's `Set-Cookie` header to the browser. */
export function rawLogin(payload: {
  email: string;
  password: string;
}): Promise<Response> {
  return fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST /auth/logout — also returns raw to forward the cookie-clear. */
export function rawLogout(cookie?: string): Promise<Response> {
  return fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

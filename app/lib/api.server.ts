import type { Entity, Sponsor, Fund } from "~/lib/types";

const API_BASE = process.env.API_URL || "http://127.0.0.1:8080/api/v1";

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

  // Phase 1 — new endpoints
  getEntities: () => fetchApi<Entity[]>("/entities"),
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

  // Auth
  login: (email: string, password: string) =>
    fetchApi<{ success: boolean; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string, confirmPassword: string) =>
    fetchApi<{ success: boolean; token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, confirm_password: confirmPassword }),
    }),
  logout: () =>
    fetchApi<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

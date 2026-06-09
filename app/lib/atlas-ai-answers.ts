import type { CopilotMessage } from "~/lib/types";

/**
 * Client-side canned Atlas-AI answers. Every citation resolves to a REAL
 * seeded record — a document (opens the Document Viewer at the cited page)
 * or an audit-ledger entry (jumps to the highlighted row). The document ids
 * and ledger uuids below match the seed script + migration exactly.
 *
 * Free-text queries fall back to `DEFAULT_ANSWER`.
 */

// Deterministic ledger uuids seeded in 20260606000000_documents_storage_review.sql
const LEDGER_PAMPA_DIST = "00000000-0000-0000-0000-000000002041";
const LEDGER_CLIP_VAL = "00000000-0000-0000-0000-000000002043";

interface Canned {
  /** Lowercased keywords; any match selects this answer. */
  keywords: string[];
  message: CopilotMessage;
}

export const SUGGESTIONS: string[] = [
  "What is my total portfolio NAV?",
  "Which funds have distributions this year?",
  "How is Andes Fund II performing?",
  "What is the current valuation of Clip?",
];

const ANSWERS: Canned[] = [
  {
    keywords: ["total", "nav", "portfolio", "aum", "value"],
    message: {
      role: "assistant",
      text: "Across your seeded funds, total NAV is approximately $71.8M. Here is the breakdown by fund:",
      table: [
        ["Fund", "NAV", "Paid-In"],
        ["Andes Direct Lending Fund II", "$19.8M", "$18.5M"],
        ["Pampa Energy Transition Fund I", "$52.0M", "$36.0M"],
      ],
      total: "$71.8M NAV",
      citations: [
        { label: "Andes Capital Account · p.1", kind: "document", document_id: "doc-cas-andes-ii", page: 1 },
        { label: "Pampa Capital Account · p.1", kind: "document", document_id: "doc-cas-pampa-i", page: 1 },
      ],
    },
  },
  {
    keywords: ["distribution", "distributions", "cash", "dpi", "realized"],
    message: {
      role: "assistant",
      text:
        "Two funds reported distributions. Pampa Energy Transition Fund I processed a $9.0M distribution from an asset sale (logged in the audit ledger), and Andes Direct Lending Fund II has distributed $4.2M YTD.",
      citations: [
        { label: "Pampa Distribution · Ledger Entry #2041", kind: "ledger", ledger_entry_id: LEDGER_PAMPA_DIST },
        { label: "Pampa Q1 Report · p.1", kind: "document", document_id: "doc-qr-pampa-i", page: 1 },
      ],
    },
  },
  {
    keywords: ["andes", "lending", "credit"],
    message: {
      role: "assistant",
      text: "Andes Direct Lending Fund II (vintage 2021) is performing in line with plan:",
      table: [
        ["Metric", "Value"],
        ["Net IRR", "9.8%"],
        ["Gross IRR", "12.4%"],
        ["TVPI", "1.30x"],
        ["DPI", "0.23x"],
      ],
      citations: [
        { label: "Andes Q1 Report · p.2", kind: "document", document_id: "doc-qr-andes-ii", page: 2 },
        { label: "Andes Annual Report 2025", kind: "document", document_id: "doc-ar-andes-ii", page: 1 },
      ],
    },
  },
  {
    keywords: ["clip", "payclip"],
    message: {
      role: "assistant",
      text:
        "Clip (Payclip) is currently valued at $11.2M against a $5.0M cost basis — a 2.24x MOIC and a 22.4% net IRR. The most recent revaluation is recorded in the audit ledger.",
      citations: [
        { label: "Clip Investor Deck · p.2", kind: "document", document_id: "doc-deck-clip", page: 2 },
        { label: "Clip Revaluation · Ledger Entry #2043", kind: "ledger", ledger_entry_id: LEDGER_CLIP_VAL },
      ],
    },
  },
  {
    keywords: ["pampa", "infrastructure", "energy"],
    message: {
      role: "assistant",
      text: "Pampa Energy Transition Fund I (vintage 2019) is the largest position by NAV:",
      table: [
        ["Metric", "Value"],
        ["NAV", "$52.0M"],
        ["Net IRR", "15.2%"],
        ["TVPI", "1.83x"],
      ],
      citations: [
        { label: "Pampa Capital Account · p.1", kind: "document", document_id: "doc-cas-pampa-i", page: 1 },
        { label: "Pampa Q1 Report · p.2", kind: "document", document_id: "doc-qr-pampa-i", page: 2 },
      ],
    },
  },
];

const DEFAULT_ANSWER: CopilotMessage = {
  role: "assistant",
  text:
    "I can answer questions about your funds, valuations, distributions and documents. Try asking about your total NAV, a specific fund's performance, or recent distributions. Every answer links to the underlying source.",
  citations: [
    { label: "Andes Capital Account · p.1", kind: "document", document_id: "doc-cas-andes-ii", page: 1 },
  ],
};

export function answerFor(query: string): CopilotMessage {
  const q = query.toLowerCase();
  for (const a of ANSWERS) {
    if (a.keywords.some((k) => q.includes(k))) return a.message;
  }
  return DEFAULT_ANSWER;
}

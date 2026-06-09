import type { TaxonomyLists } from "~/lib/types";

/**
 * Default controlled vocabularies. These seed the editable taxonomy in the
 * App store; once loaded, Settings can add/edit/delete entries and every Add
 * dropdown reads from the live store so changes propagate instantly.
 *
 * `strategies` is keyed by asset class — this is what powers the dependent
 * Strategy dropdown in the Add Fund drawer.
 */
export const DEFAULT_TAXONOMY: TaxonomyLists = {
  assetClasses: [
    "Venture Capital",
    "Private Equity",
    "Real Assets",
    "Private Credit",
    "Infrastructure",
  ],
  strategies: {
    "Venture Capital": [
      "Angel",
      "Pre-Seed",
      "Seed",
      "Series A",
      "Series B",
      "Series C",
      "Growth Stage",
    ],
    "Private Equity": [
      "Buyout",
      "Growth Equity",
      "Distressed / Special Situations",
      "Secondaries",
      "Co-investment",
      "Carve-Out",
    ],
    "Real Assets": [
      "Core",
      "Core+",
      "Value Add",
      "Opportunistic",
      "Development",
      "Mixed",
    ],
    "Private Credit": [
      "Direct Lending",
      "Mezzanine",
      "Distressed Debt",
      "Special Situations",
    ],
    Infrastructure: [
      "Core",
      "Core+",
      "Value Add",
      "Greenfield",
      "Brownfield",
    ],
  },
  subThemes: [
    "Disruptive Technologies",
    "Longevity & Health",
    "Infrastructure & Energy",
    "Demographics & Housing",
    "Consumer Behaviour",
    "Decoupling of Supply Chains",
    "Other",
  ],
  geographies: [
    "North America",
    "Latin America",
    "México",
    "Europe",
    "Asia",
    "Global",
  ],
  currencies: ["USD", "MXN", "EUR", "GBP", "CHF", "BRL"],
  sectors: [
    "Fintech",
    "Healthtech",
    "Logistics",
    "Data / AI",
    "Cleantech",
    "Consumer",
    "Infrastructure",
    "Real Estate",
    "Other",
  ],
  directAssetClasses: ["Direct Equity", "Co-investment", "SPV", "Club Deal"],
  directStages: ["Seed", "Series A", "Series B", "Series C", "Growth", "Pre-IPO", "Mature"],
  ticketSizes: ["<$50MM", "$50-200MM", "$200-400MM", "$400-600MM", ">$600MM"],
  fundSizes: [
    "<$100MM",
    "$100-500MM",
    "$500MM-$1BN",
    "$1-5BN",
    "$5-10BN",
    "+$10BN",
  ],
  riskRatings: [
    { value: "green", label: "Green — on track" },
    { value: "yellow", label: "Yellow — watch" },
    { value: "red", label: "Red — concern" },
  ],
};

/** Strategies available for an asset class (falls back to a flat union). */
export function strategiesFor(
  tax: TaxonomyLists,
  assetClass: string
): string[] {
  return tax.strategies[assetClass] ?? [];
}

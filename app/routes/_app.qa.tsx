import { useState } from "react";
import { useT } from "~/lib/use-t";

interface QAItem {
  question: string;
  answer: string;
  formula?: string;
}

interface QACategory {
  nameKey: "performanceMetrics" | "portfolioAnalytics" | "platformData";
  items: QAItem[];
}

const QA_DATA: QACategory[] = [
  {
    nameKey: "performanceMetrics",
    items: [
      {
        question: "What is TVPI (Total Value to Paid-In)?",
        answer:
          "TVPI measures the total value created by a fund relative to the capital paid in. It includes both realized (distributions) and unrealized (NAV) value.",
        formula: "TVPI = (NAV + Distributions) / Paid-In Capital",
      },
      {
        question: "What is DPI (Distributions to Paid-In)?",
        answer:
          "DPI measures the realized return of a fund. It only counts actual cash returned to investors, excluding unrealized NAV.",
        formula: "DPI = Cumulative Distributions / Paid-In Capital",
      },
      {
        question: "What is RVPI (Residual Value to Paid-In)?",
        answer:
          "RVPI measures the unrealized portion of a fund's value. It represents the remaining NAV relative to capital invested.",
        formula: "RVPI = NAV / Paid-In Capital",
      },
      {
        question: "How is IRR calculated?",
        answer:
          "Internal Rate of Return (IRR) is calculated using the XIRR method on dated cash flows. Capital calls are negative flows, distributions are positive flows, and the current NAV is used as the terminal value for unrealized positions.",
        formula: "XIRR(dates[], cashflows[]) where terminal CF = latest NAV",
      },
      {
        question: "What is the difference between Gross and Net IRR?",
        answer:
          "Gross IRR is calculated before fees and carried interest, reflecting the raw investment performance. Net IRR is after all fees, expenses, and carry, representing the actual return to the LP (limited partner).",
      },
      {
        question: "What is MOIC (Multiple on Invested Capital)?",
        answer:
          "MOIC measures total value relative to invested capital, similar to TVPI but typically used at the deal level rather than fund level.",
        formula: "MOIC = (FMV + Distributions) / Invested Capital",
      },
    ],
  },
  {
    nameKey: "portfolioAnalytics",
    items: [
      {
        question: "How are roll-up metrics calculated?",
        answer:
          "All roll-up metrics (IRR, TVPI, DPI, RVPI, MOIC) are calculated using paid-in weighted aggregation. Each fund's metric is weighted by its paid-in capital relative to total paid-in across the portfolio.",
        formula: "Weighted Metric = SUM(Fund Metric * Fund Paid-In) / SUM(Total Paid-In)",
      },
      {
        question: "What does % Called mean?",
        answer:
          "Percent Called represents how much of the total commitment has been drawn down (called) by the fund manager. A fund with 80% called has drawn $80 of every $100 committed.",
        formula: "% Called = Paid-In Capital / Commitment * 100",
      },
      {
        question: "How is NAV determined?",
        answer:
          "Net Asset Value (NAV) is the fair market value of a fund's underlying investments as reported by the General Partner (GP), typically on a quarterly basis. It represents the unrealized value of the portfolio.",
      },
      {
        question: "What is Unfunded Commitment?",
        answer:
          "Unfunded commitment is the portion of an investor's total commitment that has not yet been called by the fund. It represents a future obligation to provide capital when requested.",
        formula: "Unfunded = Commitment - Paid-In Capital",
      },
    ],
  },
  {
    nameKey: "platformData",
    items: [
      {
        question: "How often is data updated?",
        answer:
          "Fund-level NAV and performance metrics are updated quarterly, following GP reporting cycles. Document uploads and manual adjustments are reflected immediately. Transaction data is updated as capital calls and distributions occur.",
      },
      {
        question: "What document types does Atlas support?",
        answer:
          "Atlas supports Capital Account Statements, Quarterly Reports, Annual Reports, and Financial Statements. Documents can be uploaded in PDF or XLSX format, up to 50 MB per file.",
      },
      {
        question: "How does the entity filter work?",
        answer:
          "The entity selector in the top bar filters all views to show only funds, sponsors, and metrics associated with the selected legal entity (e.g., Family Office, Foundation, Trust). Selecting 'All Entities' shows the consolidated portfolio view.",
      },
      {
        question: "What is the Review workflow?",
        answer:
          "When documents are uploaded, Atlas extracts key fields (amounts, dates, metrics). Each field is assigned a confidence score. Fields below 95% confidence are flagged for manual review. Reviewers can approve, flag, or edit each field before the data flows into the portfolio.",
      },
    ],
  },
];

export default function QA() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const t = useT();

  const toggle = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-atlas-white font-display">{t.qa.title}</h1>
        <p className="text-[13px] text-atlas-gray3 mt-0.5">
          {t.qa.subtitle}
        </p>
      </div>

      {/* Categories */}
      {QA_DATA.map((cat) => (
        <div key={cat.nameKey}>
          {/* Category header */}
          <div className="text-[10px] font-semibold text-atlas-gray4 uppercase tracking-widest pb-2 mb-0 border-b border-atlas-border">
            {t.qa[cat.nameKey]}
          </div>

          {/* Items */}
          {cat.items.map((item) => {
            const key = `${cat.nameKey}::${item.question}`;
            const isOpen = openItems.has(key);
            return (
              <div
                key={key}
                className={`border-b transition-colors ${
                  isOpen ? "border-atlas-purple/30" : "border-atlas-border"
                }`}
              >
                <button
                  onClick={() => toggle(key)}
                  className="w-full flex items-center justify-between py-3.5 px-1 bg-transparent border-none cursor-pointer text-left"
                >
                  <span
                    className={`text-[13px] font-medium transition-colors ${
                      isOpen ? "text-atlas-purple" : "text-atlas-white"
                    }`}
                  >
                    {item.question}
                  </span>
                  <span
                    className={`text-lg leading-none transition-transform ${
                      isOpen
                        ? "text-atlas-purple rotate-45"
                        : "text-atlas-gray4 rotate-0"
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-1 pb-4">
                    <p className="text-[13px] text-atlas-gray2 leading-relaxed">
                      {item.answer}
                    </p>
                    {item.formula && (
                      <div className="mt-3 bg-atlas-purple-dim border border-atlas-purple/20 rounded-lg px-4 py-3">
                        <div className="text-[9px] font-semibold text-atlas-purple uppercase tracking-widest mb-1">
                          {t.qa.formula}
                        </div>
                        <div className="text-[13px] font-mono text-atlas-purple-light">
                          {item.formula}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

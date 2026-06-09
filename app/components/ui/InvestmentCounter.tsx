import { useLang } from "~/lib/lang-context";

/**
 * Breakdown pill: "15 inversiones · 8 fondos · 7 directas".
 * Counts are passed in already filtered for the active entity.
 */
export function InvestmentCounter({
  fundCount,
  directCount,
}: {
  fundCount: number;
  directCount: number;
}) {
  const { lang } = useLang();
  const total = fundCount + directCount;
  const t =
    lang === "es"
      ? { inv: "inversiones", funds: "fondos", directs: "directas" }
      : { inv: "investments", funds: "funds", directs: "direct" };
  return (
    <div className="inline-flex items-center gap-2 text-[12px] font-mono">
      <span className="px-2 py-0.5 rounded-full bg-atlas-purple-dim text-atlas-purple font-bold">
        {total} {t.inv}
      </span>
      <span className="text-atlas-gray3">·</span>
      <span className="text-atlas-gray2">{fundCount} {t.funds}</span>
      <span className="text-atlas-gray3">·</span>
      <span className="text-atlas-gray2">{directCount} {t.directs}</span>
    </div>
  );
}

export function DarkTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-lg px-3 py-2 shadow-xl">
      {label && (
        <div className="text-[10px] text-atlas-gray3 mb-1">{label}</div>
      )}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-atlas-gray2">{entry.name}:</span>
          <span className="text-atlas-white font-mono font-semibold">
            {typeof entry.value === "number"
              ? entry.value >= 1e6
                ? `$${(entry.value / 1e6).toFixed(1)}M`
                : entry.value >= 1e3
                  ? `$${(entry.value / 1e3).toFixed(0)}K`
                  : entry.value.toFixed(1)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

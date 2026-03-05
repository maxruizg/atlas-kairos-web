export function ProgressBar({
  value,
  max,
  color = "bg-atlas-purple",
  height = "h-1",
}: {
  value: number;
  max: number;
  color?: string;
  height?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={`${height} bg-atlas-border rounded-full overflow-hidden`}>
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

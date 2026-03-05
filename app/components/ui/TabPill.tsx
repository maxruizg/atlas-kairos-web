export function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
        active
          ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
          : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
      }`}
    >
      {label}
    </button>
  );
}

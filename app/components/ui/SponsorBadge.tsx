export function SponsorBadge({
  initials,
  color,
  name,
  size = "sm",
}: {
  initials: string;
  color: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[9px]",
    md: "w-8 h-8 text-[11px]",
    lg: "w-10 h-10 text-[13px]",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-md flex items-center justify-center font-bold text-white shrink-0`}
        style={{ background: color }}
      >
        {initials}
      </div>
      {name && (
        <span className="text-[12px] text-atlas-gray1 font-medium truncate">
          {name}
        </span>
      )}
    </div>
  );
}

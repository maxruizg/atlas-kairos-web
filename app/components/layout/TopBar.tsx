import { useRevalidator } from "react-router";
import { useEntity } from "~/lib/entity-context";

export function TopBar() {
  const { entities, selectedEntityId } = useEntity();
  const revalidator = useRevalidator();

  function selectEntity(id: string | null) {
    if (id) {
      document.cookie = `atlas-entity=${id};path=/;max-age=31536000`;
    } else {
      document.cookie = "atlas-entity=;path=/;max-age=0";
    }
    revalidator.revalidate();
  }

  return (
    <div className="h-11 bg-atlas-surface border-b border-atlas-border flex items-center px-5 gap-4 shrink-0">
      <div className="text-[14px] font-extrabold text-atlas-white font-display tracking-wide">
        ATLAS
      </div>
      <div className="h-4 w-px bg-atlas-border" />
      <div className="text-xs text-atlas-gray3">
        Familia Gonz&aacute;lez Office &middot; Alternatives Portfolio
      </div>

      {/* Entity selector */}
      {entities.length > 0 && (
        <>
          <div className="h-4 w-px bg-atlas-border" />
          <div className="flex gap-1">
            <button
              onClick={() => selectEntity(null)}
              className={`px-2 py-[2px] rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                !selectedEntityId
                  ? "bg-atlas-purple-dim text-atlas-purple border border-atlas-purple"
                  : "bg-transparent text-atlas-gray3 border border-atlas-border hover:border-atlas-gray4"
              }`}
            >
              All
            </button>
            {entities.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEntity(e.id)}
                className={`px-2 py-[2px] rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                  selectedEntityId === e.id
                    ? "bg-atlas-purple-dim text-atlas-purple border border-atlas-purple"
                    : "bg-transparent text-atlas-gray3 border border-atlas-border hover:border-atlas-gray4"
                }`}
              >
                {e.short}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="ml-auto flex gap-2.5 items-center">
        <div className="w-2 h-2 rounded-full bg-atlas-orange shadow-[0_0_6px_#FFB347]" />
        <span className="text-[11px] text-atlas-orange font-semibold">
          1 document needs review
        </span>
        <div className="w-px h-4 bg-atlas-border" />
        <span className="text-[11px] text-atlas-gray3 font-mono">Mar 5, 2026</span>
      </div>
    </div>
  );
}

import { useRevalidator, Link } from "react-router";
import { useEntity } from "~/lib/entity-context";
import { useTheme } from "~/lib/theme-context";
import { useLang } from "~/lib/lang-context";
import { useClientData } from "~/lib/client-data-context";
import { useT } from "~/lib/use-t";

interface TopBarProps {
  organizationName: string;
}

export function TopBar({ organizationName }: TopBarProps) {
  const { entities, selectedEntityId } = useEntity();
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLang();
  const t = useT();
  const revalidator = useRevalidator();
  // Drive the header badge from the same documents query the Vault/Review use,
  // so it can never disagree with them (QA #8). Hidden entirely when zero.
  const { documents } = useClientData();
  const needsReview = documents.filter((d) => d.status === "Needs Review").length;

  function selectEntity(id: string | null) {
    if (id) {
      document.cookie = `atlas-entity=${id};path=/;max-age=31536000`;
    } else {
      document.cookie = "atlas-entity=;path=/;max-age=0";
    }
    revalidator.revalidate();
  }

  const dateStr = new Intl.DateTimeFormat(lang === "es" ? "es" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(2026, 2, 5));

  return (
    <div className="h-11 bg-atlas-surface border-b border-atlas-border flex items-center px-5 gap-4 shrink-0">
      <div className="flex items-center gap-1.5">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="text-atlas-purple">
          <path d="M16 2L28 16L16 30L4 16L16 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M16 8L22 16L16 24L10 16L16 8Z" fill="currentColor" />
        </svg>
        <span className="text-[14px] font-extrabold text-atlas-purple font-display tracking-wide">
          ATLAS
        </span>
      </div>
      <div className="h-4 w-px bg-atlas-border" />
      <div className="text-xs text-atlas-gray3">
        {organizationName || "Atlas"} &middot; Alternatives Portfolio
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
              {t.topbar.all}
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
        <button
          onClick={toggleTheme}
          className="relative w-9 h-5 rounded-full bg-atlas-border cursor-pointer transition-colors hover:bg-atlas-border-bright"
          title={theme === "dark" ? t.topbar.darkMode : t.topbar.lightMode}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-atlas-gray1 transition-transform duration-200 flex items-center justify-center text-[9px] ${
              theme === "light" ? "translate-x-4 bg-atlas-purple" : ""
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-atlas-surface">
              {theme === "dark" ? (
                <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06M11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M13.36 10.06A6 6 0 0 1 5.94 2.64 6 6 0 1 0 13.36 10.06Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </span>
        </button>
        {needsReview > 0 && (
          <>
            <div className="w-px h-4 bg-atlas-border" />
            <Link
              to="/review"
              className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
            >
              <div className="w-2 h-2 rounded-full bg-atlas-orange shadow-[0_0_6px_#FFB347]" />
              <span className="text-[11px] text-atlas-orange font-semibold">
                {t.topbar.reviewAlert(needsReview)}
              </span>
            </Link>
          </>
        )}
        <div className="w-px h-4 bg-atlas-border" />
        <span className="text-[11px] text-atlas-gray3 font-mono">{dateStr}</span>
      </div>
    </div>
  );
}

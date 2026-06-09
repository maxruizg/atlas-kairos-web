import { NavLink, useRouteLoaderData } from "react-router";
import { useT } from "~/lib/use-t";
import { useCan } from "~/lib/use-permissions";
import { initialsFromName } from "~/lib/utils";
import type { UserPublic } from "~/lib/api.server";

export function Sidebar() {
  const t = useT();
  const cn = useCan();
  const parentData = useRouteLoaderData("routes/_app") as
    | { user?: UserPublic }
    | undefined;
  const user = parentData?.user;

  const items = [
    { to: "/", icon: "\u25C9", label: t.sidebar.entityMap },
    { to: "/dashboard", icon: "\u25A6", label: t.sidebar.portfolio },
    { to: "/sponsors", icon: "\u25C8", label: t.sidebar.sponsors },
    { to: "/directs", icon: "\u25C6", label: t.sidebar.directs },
    { to: "/vault", icon: "\u229E", label: t.sidebar.vault },
    { to: "/review", icon: "\u25CE", label: t.sidebar.review },
    { to: "/metrics", icon: "\u25B3", label: t.sidebar.metrics },
    ...(cn("ledger.view") ? [{ to: "/ledger", icon: "\u2261", label: t.sidebar.ledger }] : []),
    { to: "/qa", icon: "?", label: t.sidebar.qa },
    { to: "/atlas-ai", icon: "\u2726", label: t.sidebar.oracle },
  ];

  return (
    <div className="w-[62px] bg-atlas-surface border-r border-atlas-border flex flex-col items-center py-4 gap-1 shrink-0">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          prefetch="intent"
          end={item.to === "/" || item.to === "/dashboard"}
          className={({ isActive }) =>
            `w-[46px] h-[46px] rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 no-underline ${
              isActive
                ? "bg-atlas-purple-dim text-atlas-purple"
                : "bg-transparent text-atlas-gray2 hover:text-atlas-gray1"
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          <span className="text-[8px] font-semibold tracking-wide">
            {item.label}
          </span>
        </NavLink>
      ))}

      {/* Bottom: Settings + Avatar */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-[46px] h-[46px] rounded-[10px] flex flex-col items-center justify-center gap-0.5 no-underline transition-all duration-150 ${
              isActive
                ? "bg-atlas-purple-dim text-atlas-purple"
                : "bg-transparent text-atlas-gray2 hover:text-atlas-gray1"
            }`
          }
          title={t.sidebar.settings}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-[8px] font-semibold tracking-wide">
            {t.sidebar.settings}
          </span>
        </NavLink>
        <div
          title={user?.name ?? ""}
          className="w-7 h-7 rounded-full bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-[11px] text-atlas-purple font-bold cursor-default"
        >
          {initialsFromName(user?.name)}
        </div>
      </div>
    </div>
  );
}

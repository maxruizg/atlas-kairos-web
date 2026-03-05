import { NavLink } from "react-router";

const items = [
  { to: "/", icon: "\u25A6", label: "Portfolio" },
  { to: "/sponsors", icon: "\u25C8", label: "Sponsors" },
  { to: "/vault", icon: "\u229E", label: "Vault" },
  { to: "/review", icon: "\u25CE", label: "Review" },
  { to: "/metrics", icon: "\u25B2", label: "Metrics" },
  { to: "/copilot", icon: "\u2726", label: "Copilot" },
];

export function Sidebar() {
  return (
    <div className="w-[62px] bg-atlas-surface border-r border-atlas-border flex flex-col items-center py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="text-[9px] font-extrabold text-atlas-purple tracking-[0.15em] font-display">
          ATLAS
        </div>
      </div>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          prefetch="intent"
          end={item.to === "/"}
          className={({ isActive }) =>
            `w-[46px] h-[46px] rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 no-underline ${
              isActive
                ? "bg-atlas-purple-dim text-atlas-purple"
                : "bg-transparent text-atlas-gray4 hover:text-atlas-gray3"
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          <span className="text-[8px] font-semibold tracking-wide">
            {item.label}
          </span>
        </NavLink>
      ))}

      {/* Bottom avatar */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-[11px] text-atlas-purple font-bold">
          CG
        </div>
      </div>
    </div>
  );
}

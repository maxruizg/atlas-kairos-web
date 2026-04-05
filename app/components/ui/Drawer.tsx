import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[250]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-[420px] bg-atlas-surface border-l border-atlas-border flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-atlas-border shrink-0">
          <span className="text-[15px] font-bold text-atlas-white font-display">
            {title}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-atlas-gray3 hover:text-atlas-white hover:bg-atlas-card transition-colors cursor-pointer text-lg"
          >
            &times;
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

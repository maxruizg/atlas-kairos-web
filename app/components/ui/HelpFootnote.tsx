import { useState } from "react";
import { TutorialModal } from "~/components/ui/TutorialModal";
import { TUTORIALS, type TutorialId } from "~/lib/tutorials";
import { useT } from "~/lib/use-t";

/**
 * Subtle "¿Primera vez? ..." footnote placed near a primary action. Clicking
 * it opens the matching step-by-step tutorial modal. `label` overrides the
 * default footnote copy (e.g. to use the tutorial title in the Q&A list).
 */
export function HelpFootnote({
  tutorial,
  label,
  className = "",
}: {
  tutorial: TutorialId;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-[11px] text-atlas-gray4 hover:text-atlas-purple transition-colors cursor-pointer bg-transparent border-none p-0 ${className}`}
      >
        <span className="text-atlas-purple">&#x2139;</span>
        <span className="underline underline-offset-2">{label ?? t.tutorials.firstTime}</span>
      </button>
      {open && <TutorialModal tutorial={TUTORIALS[tutorial]} onClose={() => setOpen(false)} />}
    </>
  );
}

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Tutorial } from "~/lib/tutorials";
import { useT } from "~/lib/use-t";

/**
 * A simple numbered stepper modal for in-context tutorials. Theme-token only,
 * works in dark + light. Navigated with Siguiente / Anterior / Entendido.
 */
export function TutorialModal({ tutorial, onClose }: { tutorial: Tutorial; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const t = useT();
  const tt = t.tutorials;
  const total = tutorial.steps.length;
  const isLast = step === total - 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !isLast) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, isLast, step]);

  return createPortal(
    <div className="fixed inset-0 z-[320] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-atlas-card border border-atlas-border rounded-2xl w-full max-w-[520px] mx-4 p-6 shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div className="text-[10px] text-atlas-purple font-bold uppercase tracking-wider">
            {tt.stepOf(step + 1, total)}
          </div>
          <button
            onClick={onClose}
            className="text-atlas-gray3 hover:text-atlas-white text-lg leading-none cursor-pointer bg-transparent border-none"
          >
            &times;
          </button>
        </div>
        <h2 className="text-[18px] font-bold text-atlas-white font-display mb-1">{tutorial.title}</h2>
        {step === 0 && <p className="text-[12px] text-atlas-gray3 mb-4">{tutorial.intro}</p>}

        {/* Step body */}
        <div className="bg-atlas-surface border border-atlas-border rounded-xl p-5 my-4 min-h-[120px] flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-atlas-purple font-bold text-[12px] shrink-0">
            {step + 1}
          </div>
          <p className="text-[13.5px] text-atlas-white leading-relaxed">{tutorial.steps[step]}</p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mb-5">
          {tutorial.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${
                i === step ? "w-5 bg-atlas-purple" : "w-1.5 bg-atlas-border hover:bg-atlas-gray4"
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-between gap-2">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &larr; {tt.previous}
          </button>
          {isLast ? (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border-none bg-atlas-purple text-atlas-white text-xs font-semibold cursor-pointer"
            >
              {tt.gotIt}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              className="px-5 py-2 rounded-lg border-none bg-atlas-purple text-atlas-white text-xs font-semibold cursor-pointer"
            >
              {tt.next} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

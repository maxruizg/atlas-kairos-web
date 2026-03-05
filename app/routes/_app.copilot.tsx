import { useLoaderData, useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "~/lib/api.server";
import type { CopilotMessage, CopilotSuggestion } from "~/lib/types";

export async function loader() {
  const [history, suggestions] = await Promise.all([
    api.getCopilotHistory(),
    api.getCopilotSuggestions(),
  ]);
  return { history, suggestions };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const query = formData.get("query") as string;
  const result = await api.submitCopilotQuery(query);
  return result;
}

export default function Copilot() {
  const { history, suggestions } = useLoaderData<{
    history: CopilotMessage[];
    suggestions: CopilotSuggestion[];
  }>();
  const fetcher = useFetcher();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build messages list with optimistic pending
  const messages = [...history];
  if (fetcher.formData) {
    const pendingQuery = fetcher.formData.get("query") as string;
    if (pendingQuery) {
      messages.push({ role: "user", text: pendingQuery });
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(query?: string) {
    const q = query || input.trim();
    if (!q) return;
    fetcher.submit({ query: q }, { method: "post" });
    setInput("");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-7 pt-5 pb-4 border-b border-atlas-border flex gap-2.5 items-center">
        <div className="w-8 h-8 rounded-[10px] bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-sm">
          &#x2726;
        </div>
        <div>
          <div className="text-[15px] font-bold text-atlas-white font-display">COPILOT</div>
          <div className="text-[11px] text-atlas-gray4">
            Deterministic Q&amp;A &middot; All answers backed by ledger data and document citations
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-[18px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 items-start ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold border ${
                msg.role === "user"
                  ? "bg-atlas-purple-dim border-atlas-purple text-atlas-purple"
                  : "bg-atlas-surface border-atlas-border text-atlas-gray3"
              }`}
            >
              {msg.role === "user" ? "CG" : "\u2726"}
            </div>

            {/* Content */}
            <div className="max-w-[75%] flex flex-col gap-2">
              {/* Text bubble */}
              <div
                className={`rounded-xl px-3.5 py-2.5 text-[13px] text-atlas-white leading-relaxed border ${
                  msg.role === "user"
                    ? "bg-atlas-purple-dim border-atlas-purple/25"
                    : "bg-atlas-card border-atlas-border"
                }`}
              >
                {msg.text}
              </div>

              {/* Table */}
              {msg.table && (
                <div className="bg-atlas-card border border-atlas-border rounded-[10px] overflow-hidden">
                  <table className="w-full border-collapse">
                    <tbody>
                      {msg.table.map((row, ri) => (
                        <tr
                          key={ri}
                          className={`border-b border-atlas-border ${
                            ri === 0 ? "bg-atlas-surface" : ""
                          }`}
                        >
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`py-[7px] px-3 text-xs ${
                                ri === 0
                                  ? "font-bold text-atlas-gray3"
                                  : ci === 1
                                  ? "font-semibold text-atlas-white font-mono"
                                  : ci > 0
                                  ? "font-semibold text-atlas-gray2 font-mono"
                                  : "text-atlas-gray2"
                              } ${ci > 0 ? "text-right" : "text-left"}`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {msg.total && (
                    <div className="py-[7px] px-3 text-xs font-bold text-atlas-purple border-t border-atlas-border text-right font-mono">
                      Total: {msg.total}
                    </div>
                  )}
                </div>
              )}

              {/* Citations */}
              {msg.citations && (
                <div className="flex flex-wrap gap-[5px]">
                  <span className="text-[10px] text-atlas-gray4 mr-0.5">Sources:</span>
                  {msg.citations.map((c, ci) => (
                    <span
                      key={ci}
                      className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light cursor-pointer"
                    >
                      &#x1F517; {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-7 pb-3 flex gap-1.5 flex-wrap">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSubmit(s.text)}
            className="px-3 py-[5px] rounded-full border border-atlas-border bg-transparent text-atlas-gray3 text-[11px] cursor-pointer transition-colors hover:border-atlas-purple hover:text-atlas-purple"
          >
            {s.text}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-7 pb-6 pt-3 flex gap-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ask about your portfolio\u2026"
          className="flex-1 bg-atlas-card border border-atlas-border rounded-[10px] px-4 py-[11px] text-[13px] text-atlas-white outline-none font-[inherit] placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors"
        />
        <button
          onClick={() => handleSubmit()}
          className="px-5 rounded-[10px] border-none bg-atlas-purple text-atlas-white text-[13px] font-semibold cursor-pointer"
        >
          Ask
        </button>
      </div>
    </div>
  );
}

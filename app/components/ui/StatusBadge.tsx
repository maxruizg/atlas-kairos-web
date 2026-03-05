const statusMap: Record<string, { bg: string; text: string }> = {
  "Needs Review": { bg: "bg-atlas-orange-dim", text: "text-atlas-orange" },
  Approved: { bg: "bg-atlas-green-dim", text: "text-atlas-green" },
  Extracted: { bg: "bg-atlas-blue-dim", text: "text-atlas-blue" },
  Uploaded: { bg: "bg-atlas-gray5/40", text: "text-atlas-gray3" },
  Posted: { bg: "bg-atlas-green-dim", text: "text-atlas-green" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || statusMap["Uploaded"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text}`}
    >
      <span
        className={`w-[5px] h-[5px] rounded-full ${s.text.replace("text-", "bg-")}`}
      />
      {status}
    </span>
  );
}

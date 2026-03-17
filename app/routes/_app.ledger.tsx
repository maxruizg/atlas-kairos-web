import { useT } from "~/lib/use-t";

const AUDIT_LOG = [
  {
    timestamp: "2026-03-10 14:32:01",
    user: "Carlos G.",
    initials: "CG",
    action: "Approved",
    entity: "Apex Growth Fund III",
    field: "Q3 NAV",
    old_value: null,
    new_value: "$14,920,000",
    screen: "Review",
  },
  {
    timestamp: "2026-03-10 13:15:44",
    user: "Carlos G.",
    initials: "CG",
    action: "Updated",
    entity: "Infrastructure Partners IV",
    field: "Net IRR",
    old_value: "10.5%",
    new_value: "11.8%",
    screen: "Metrics",
  },
  {
    timestamp: "2026-03-09 17:22:10",
    user: "Ana M.",
    initials: "AM",
    action: "Uploaded",
    entity: "Meridian PE Fund II",
    field: "Q3 Report",
    old_value: null,
    new_value: "Meridian_Q3_Report.pdf",
    screen: "Vault",
  },
  {
    timestamp: "2026-03-09 11:05:33",
    user: "Carlos G.",
    initials: "CG",
    action: "Edited",
    entity: "TechBridge Direct Co-invest",
    field: "Commitment",
    old_value: "$4,800,000",
    new_value: "$5,000,000",
    screen: "Portfolio",
  },
  {
    timestamp: "2026-03-08 16:48:22",
    user: "Ana M.",
    initials: "AM",
    action: "Approved",
    entity: "HealthCo Ventures I",
    field: "Q2 Statement",
    old_value: null,
    new_value: "$2,100,000",
    screen: "Review",
  },
  {
    timestamp: "2026-03-08 09:30:15",
    user: "Carlos G.",
    initials: "CG",
    action: "Added",
    entity: "Apex Secondaries Fund I",
    field: "Fund",
    old_value: null,
    new_value: "Apex Secondaries Fund I",
    screen: "Portfolio",
  },
  {
    timestamp: "2026-03-07 15:12:08",
    user: "Ana M.",
    initials: "AM",
    action: "Updated",
    entity: "Apex Growth Fund III",
    field: "Distributions",
    old_value: "$1,400,000",
    new_value: "$1,640,000",
    screen: "Metrics",
  },
  {
    timestamp: "2026-03-07 10:45:50",
    user: "Carlos G.",
    initials: "CG",
    action: "Uploaded",
    entity: "LatAm Infrastructure Partners",
    field: "Capital Call Notice",
    old_value: null,
    new_value: "LatAm_Infra_CapCall_Nov25.pdf",
    screen: "Vault",
  },
];

function actionColor(action: string) {
  switch (action) {
    case "Approved":
      return "bg-atlas-green-dim text-atlas-green";
    case "Updated":
    case "Edited":
      return "bg-atlas-orange-dim text-atlas-orange";
    case "Uploaded":
    case "Added":
      return "bg-atlas-blue-dim text-atlas-blue";
    default:
      return "bg-atlas-surface text-atlas-gray3";
  }
}

export default function Ledger() {
  const t = useT();
  const tl = t.ledger;

  const tableHeaders = [
    tl.colTimestamp, tl.colUser, tl.colAction, tl.colEntity,
    tl.colField, tl.colOldValue, tl.colNewValue, tl.colScreen,
  ];

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{tl.title}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {tl.subtitle}
          </p>
        </div>
        <button className="px-3.5 py-[7px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer font-medium">
          {tl.exportLog}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-atlas-purple-dim border border-atlas-purple/20 rounded-[10px] px-4 py-2.5 flex gap-2.5 items-center">
        <span className="text-atlas-purple text-base">&#x1F512;</span>
        <span className="text-xs text-atlas-gray2">
          {tl.immutableNotice.split("{bold}")[0]}
          <strong className="text-atlas-purple">{tl.immutableBold}</strong>
          {tl.immutableNotice.split("{bold}")[1]}
        </span>
      </div>

      {/* Table */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-atlas-surface">
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className="py-[9px] px-3 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider whitespace-nowrap text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AUDIT_LOG.map((entry, i) => (
                <tr
                  key={i}
                  className="border-t border-atlas-border hover:bg-atlas-card-hover transition-colors"
                >
                  <td className="py-3 px-3 text-[11px] text-atlas-gray2 font-mono whitespace-nowrap">
                    {entry.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-[9px] font-bold text-atlas-purple shrink-0">
                        {entry.initials}
                      </div>
                      <span className="text-[12px] text-atlas-white font-medium">
                        {entry.user}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${actionColor(entry.action)}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[12px] text-atlas-white font-medium">
                    {entry.entity}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-atlas-gray3">{entry.field}</td>
                  <td className="py-3 px-3 text-[12px] font-mono text-atlas-red">
                    {entry.old_value ?? "\u2014"}
                  </td>
                  <td className="py-3 px-3 text-[12px] font-mono text-atlas-green">
                    {entry.new_value ?? "\u2014"}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light font-semibold">
                      {entry.screen}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

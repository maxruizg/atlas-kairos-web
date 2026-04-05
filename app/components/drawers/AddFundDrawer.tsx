import { useState, useMemo } from "react";
import { Drawer } from "~/components/ui/Drawer";
import { useClientData } from "~/lib/client-data-context";
import { useEntity } from "~/lib/entity-context";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

const ASSET_CLASSES = ["Venture Capital", "Private Equity", "Real Assets", "Direct"];
const CURRENCIES = ["USD", "MXN", "EUR", "GBP", "CHF", "BRL"];

interface Props {
  open: boolean;
  onClose: () => void;
  sponsorId: string;
}

export function AddFundDrawer({ open, onClose, sponsorId }: Props) {
  const { addFund } = useClientData();
  const { entities } = useEntity();
  const { toast } = useToast();
  const t = useT();
  const td = t.drawers;

  const [name, setName] = useState("");
  const [vintage, setVintage] = useState("");
  const [assetClass, setAssetClass] = useState(ASSET_CLASSES[1]);
  const [strategy, setStrategy] = useState("");
  const [subTheme, setSubTheme] = useState("");
  const [geography, setGeography] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [entityId, setEntityId] = useState(entities[0]?.id || "");
  const [commitment, setCommitment] = useState("");
  const [paidIn, setPaidIn] = useState("");
  const [nav, setNav] = useState("");
  const [distributions, setDistributions] = useState("");
  const [unfunded, setUnfunded] = useState("");
  const [grossIrr, setGrossIrr] = useState("");
  const [netIrr, setNetIrr] = useState("");
  const [grossMoic, setGrossMoic] = useState("");
  const [netMoic, setNetMoic] = useState("");
  const [reportQ, setReportQ] = useState("");
  const [reportReceived, setReportReceived] = useState(false);

  const paidInNum = parseFloat(paidIn) || 0;
  const commitmentNum = parseFloat(commitment) || 0;
  const navNum = parseFloat(nav) || 0;
  const distNum = parseFloat(distributions) || 0;

  const pctCalled = useMemo(() => commitmentNum > 0 ? (paidInNum / commitmentNum) * 100 : 0, [paidInNum, commitmentNum]);
  const tvpi = useMemo(() => paidInNum > 0 ? (distNum + navNum) / paidInNum : 0, [distNum, navNum, paidInNum]);
  const dpi = useMemo(() => paidInNum > 0 ? distNum / paidInNum : 0, [distNum, paidInNum]);
  const rvpi = useMemo(() => paidInNum > 0 ? navNum / paidInNum : 0, [navNum, paidInNum]);

  const handleSubmit = () => {
    if (!name.trim() || !vintage.trim()) return;
    addFund({
      id: `f-${crypto.randomUUID().slice(0, 8)}`,
      sponsor_id: sponsorId,
      entity_id: entityId,
      name: name.trim(),
      vintage: parseInt(vintage) || 2024,
      strategy: strategy || "Growth",
      asset_class: assetClass,
      geography: geography || "Global",
      currency,
      commitment: commitmentNum,
      paid_in: paidInNum,
      nav: navNum,
      distributions: distNum,
      unfunded: parseFloat(unfunded) || 0,
      tvpi,
      dpi,
      rvpi,
      gross_irr: parseFloat(grossIrr) || 0,
      net_irr: parseFloat(netIrr) || 0,
      gross_moic: parseFloat(grossMoic) || 0,
      net_moic: parseFloat(netMoic) || 0,
      pct_called: pctCalled,
      latest_report_q: reportQ || "Q4 2025",
      report_received: reportReceived,
      transactions: [],
      companies: [],
      nav_history: [],
      cashflows: [],
    });
    toast(td.fundAdded, "success");
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(""); setVintage(""); setStrategy(""); setSubTheme(""); setGeography("");
    setPaidIn(""); setNav(""); setDistributions(""); setUnfunded("");
    setCommitment(""); setGrossIrr(""); setNetIrr(""); setGrossMoic(""); setNetMoic("");
    setReportQ(""); setReportReceived(false);
    onClose();
  };

  return (
    <Drawer open={open} onClose={resetAndClose} title={td.addFund}>
      <div className="flex flex-col">
        <Label required>{td.fundName}</Label>
        <Input value={name} onChange={setName} />

        <Label required>{td.vintageYear}</Label>
        <Input value={vintage} onChange={setVintage} type="number" />

        <Label>{td.assetClass}</Label>
        <Select value={assetClass} onChange={setAssetClass} options={ASSET_CLASSES} />

        <Label>{td.strategy}</Label>
        <Input value={strategy} onChange={setStrategy} />

        <Label>{td.subTheme}</Label>
        <Input value={subTheme} onChange={setSubTheme} />

        <Label>{td.geography}</Label>
        <Input value={geography} onChange={setGeography} />

        <Label>{td.currency}</Label>
        <Select value={currency} onChange={setCurrency} options={CURRENCIES} />

        <Label>{td.entityAssignment}</Label>
        <Select value={entityId} onChange={setEntityId} options={entities.map((e) => e.id)} labels={entities.map((e) => e.short + " — " + e.name)} />

        <div className="border-t border-atlas-border my-3" />

        <Label>{td.commitment}</Label>
        <Input value={commitment} onChange={setCommitment} type="number" />

        <Label>{td.paidIn}</Label>
        <Input value={paidIn} onChange={setPaidIn} type="number" />

        <Label>{td.navLabel}</Label>
        <Input value={nav} onChange={setNav} type="number" />

        <Label>{td.distributions}</Label>
        <Input value={distributions} onChange={setDistributions} type="number" />

        <Label>{td.unfunded}</Label>
        <Input value={unfunded} onChange={setUnfunded} type="number" />

        <Label>{td.pctCalled}</Label>
        <ReadOnlyField value={`${pctCalled.toFixed(1)}%`} />

        <div className="border-t border-atlas-border my-3" />

        <Label>{td.grossIrr}</Label>
        <Input value={grossIrr} onChange={setGrossIrr} type="number" />

        <Label>{td.netIrr}</Label>
        <Input value={netIrr} onChange={setNetIrr} type="number" />

        <Label>{td.grossMoic}</Label>
        <Input value={grossMoic} onChange={setGrossMoic} type="number" />

        <Label>{td.netMoic}</Label>
        <Input value={netMoic} onChange={setNetMoic} type="number" />

        <Label>TVPI</Label>
        <ReadOnlyField value={tvpi.toFixed(2) + "x"} />

        <Label>DPI</Label>
        <ReadOnlyField value={dpi.toFixed(2) + "x"} />

        <Label>RVPI</Label>
        <ReadOnlyField value={rvpi.toFixed(2) + "x"} />

        <div className="border-t border-atlas-border my-3" />

        <Label>{td.latestReportQ}</Label>
        <Input value={reportQ} onChange={setReportQ} />

        <Label>{td.reportReceived}</Label>
        <label className="flex items-center gap-2 mb-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={reportReceived}
            onChange={(e) => setReportReceived(e.target.checked)}
            className="accent-atlas-purple"
          />
          <span className="text-[12px] text-atlas-gray2">{reportReceived ? "Yes" : "No"}</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !vintage.trim()}
          className="w-full mt-5 py-2.5 rounded-lg bg-atlas-purple text-atlas-white text-[13px] font-semibold cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {td.save}
        </button>
        <button
          onClick={resetAndClose}
          className="w-full mt-2 py-2.5 rounded-lg bg-transparent border border-atlas-border text-atlas-gray2 text-[13px] font-medium cursor-pointer hover:border-atlas-gray4 transition-colors"
        >
          {td.cancel}
        </button>
      </div>
    </Drawer>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[11px] text-atlas-gray2 font-semibold font-sans mb-1">
      {children}
      {required && <span className="text-atlas-red ml-0.5">*</span>}
    </label>
  );
}

function Input({ value, onChange, type = "text", maxLength }: { value: string; onChange: (v: string) => void; type?: string; maxLength?: number }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function Select({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels?: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none cursor-pointer appearance-none focus:border-atlas-purple transition-colors mb-3.5"
    >
      {options.map((o, i) => (
        <option key={o} value={o}>{labels ? labels[i] : o}</option>
      ))}
    </select>
  );
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="bg-atlas-gray5 border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-gray2 font-mono cursor-not-allowed mb-3.5">
      {value}
    </div>
  );
}

import { useState, useMemo } from "react";
import { Drawer } from "~/components/ui/Drawer";
import { useClientData } from "~/lib/client-data-context";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

const STATUS_OPTIONS = ["Active", "Realized", "Written Off"];

interface Props {
  open: boolean;
  onClose: () => void;
  fundId: string;
}

export function AddCompanyDrawer({ open, onClose, fundId }: Props) {
  const { addCompany } = useClientData();
  const { toast } = useToast();
  const t = useT();
  const td = t.drawers;

  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [date, setDate] = useState("");
  const [invested, setInvested] = useState("");
  const [fmv, setFmv] = useState("");
  const [irr, setIrr] = useState("");
  const [own, setOwn] = useState("");
  const [status, setStatus] = useState("Active");

  const investedNum = parseFloat(invested) || 0;
  const fmvNum = parseFloat(fmv) || 0;
  const moic = useMemo(() => investedNum > 0 ? fmvNum / investedNum : 0, [fmvNum, investedNum]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addCompany(fundId, {
      name: name.trim(),
      theme: theme || "General",
      stage: null,
      date: date || new Date().toISOString().slice(0, 10),
      status,
      invested: investedNum,
      fmv: fmvNum,
      moic,
      irr: parseFloat(irr) || 0,
      own: parseFloat(own) || 0,
    });
    toast(td.companyAdded, "success");
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(""); setTheme(""); setDate(""); setInvested("");
    setFmv(""); setIrr(""); setOwn(""); setStatus("Active");
    onClose();
  };

  return (
    <Drawer open={open} onClose={resetAndClose} title={td.addCompany}>
      <div className="flex flex-col">
        <Label required>{td.companyName}</Label>
        <Input value={name} onChange={setName} />

        <Label>{td.theme}</Label>
        <Input value={theme} onChange={setTheme} />

        <Label>{td.investmentDate}</Label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        <Label>{td.investedAmount}</Label>
        <Input value={invested} onChange={setInvested} type="number" />

        <Label>{td.fmv}</Label>
        <Input value={fmv} onChange={setFmv} type="number" />

        <Label>MOIC</Label>
        <div className="bg-atlas-gray5 border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-gray2 font-mono cursor-not-allowed mb-3.5">
          {moic.toFixed(2)}x
        </div>

        <Label>{td.irrPct}</Label>
        <Input value={irr} onChange={setIrr} type="number" />

        <Label>{td.ownershipPct}</Label>
        <Input value={own} onChange={setOwn} type="number" />

        <Label>{td.status}</Label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none cursor-pointer appearance-none focus:border-atlas-purple transition-colors mb-3.5"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
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

function Input({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

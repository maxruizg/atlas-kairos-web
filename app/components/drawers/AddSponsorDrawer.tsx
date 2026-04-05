import { useState } from "react";
import { Drawer } from "~/components/ui/Drawer";
import { useClientData } from "~/lib/client-data-context";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

const COLOR_SWATCHES = ["#8B7BD8", "#4DA8FF", "#00E5A0", "#FFB347", "#FF5C5C", "#00D4FF"];
const ASSET_CLASS_OPTIONS = ["Venture Capital", "Private Equity", "Real Assets", "Direct"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddSponsorDrawer({ open, onClose }: Props) {
  const { addSponsor } = useClientData();
  const { toast } = useToast();
  const t = useT();
  const td = t.drawers;

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [country, setCountry] = useState("");
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [overview, setOverview] = useState("");
  const [website, setWebsite] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);

  const deriveInitials = (val: string) => {
    const words = val.trim().split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : val.slice(0, 2).toUpperCase();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim()) setInitials(deriveInitials(val));
  };

  const toggleAsset = (ac: string) => {
    setAssetClasses((prev) =>
      prev.includes(ac) ? prev.filter((a) => a !== ac) : [...prev, ac]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addSponsor({
      id: `s-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      initials: initials || deriveInitials(name),
      country: country || "N/A",
      color,
      fund_count: 0,
      total_nav: 0,
      total_commitment: 0,
      tvpi: 0,
      net_irr: 0,
      asset_classes: assetClasses.length > 0 ? assetClasses : ["Private Equity"],
      company_count: 0,
    });
    toast(td.sponsorAdded, "success");
    resetAndClose();
  };

  const resetAndClose = () => {
    setName(""); setInitials(""); setCountry(""); setAssetClasses([]);
    setOverview(""); setWebsite(""); setContactName(""); setContactEmail("");
    setColor(COLOR_SWATCHES[0]);
    onClose();
  };

  return (
    <Drawer open={open} onClose={resetAndClose} title={td.addSponsor}>
      <div className="flex flex-col">
        {/* Name */}
        <Label required>{td.sponsorName}</Label>
        <Input value={name} onChange={handleNameChange} />

        {/* Initials */}
        <Label>{td.initials}</Label>
        <Input value={initials} onChange={setInitials} maxLength={2} />

        {/* Country */}
        <Label>{td.country}</Label>
        <Input value={country} onChange={setCountry} />

        {/* Asset Classes */}
        <Label>{td.assetClasses}</Label>
        <div className="flex flex-wrap gap-2 mb-3.5">
          {ASSET_CLASS_OPTIONS.map((ac) => (
            <button
              key={ac}
              type="button"
              onClick={() => toggleAsset(ac)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer transition-colors ${
                assetClasses.includes(ac)
                  ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                  : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
              }`}
            >
              {ac}
            </button>
          ))}
        </div>

        {/* Overview */}
        <Label>{td.overview}</Label>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={3}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none resize-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        {/* Website */}
        <Label>{td.website}</Label>
        <Input value={website} onChange={setWebsite} />

        {/* Contact Name */}
        <Label>{td.contactName}</Label>
        <Input value={contactName} onChange={setContactName} />

        {/* Contact Email */}
        <Label>{td.contactEmail}</Label>
        <Input value={contactEmail} onChange={setContactEmail} />

        {/* Color */}
        <Label>{td.color}</Label>
        <div className="flex gap-2 mb-3.5">
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-colors ${
                color === c ? "border-atlas-white" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        {/* Submit */}
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

function Input({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5"
    />
  );
}

import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { Drawer } from "~/components/ui/Drawer";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";
import { HelpFootnote } from "~/components/ui/HelpFootnote";
import type { BeneficialOwner } from "~/lib/types";

const ENTITY_TYPES = [
  "LLC",
  "Trust",
  "Foundation",
  "Limited Partnership",
  "Corporation",
  "SPV",
  "Other",
];
const STATUS_OPTIONS = ["Active", "Dormant", "Dissolved"];
const TAX_CLASS_OPTIONS = [
  "Pass-through",
  "Corporation",
  "Foreign",
  "Tax-exempt",
  "Other",
];
const FATCA_OPTIONS = [
  "US Person",
  "Active NFFE",
  "Passive NFFE",
  "FFI",
  "N/A",
];
const RISK_OPTIONS = ["Low", "Medium", "High"];
const CURRENCIES = ["USD", "EUR", "MXN", "GBP", "CHF", "BRL", "CAD", "JPY"];

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ActionResult {
  intent?: string;
  ok?: boolean;
  error?: string;
}

const initialOwner = (): BeneficialOwner => ({
  name: "",
  ownership_pct: 0,
  role: "",
});

export function AddEntityDrawer({ open, onClose }: Props) {
  const fetcher = useFetcher<ActionResult>();
  const { toast } = useToast();
  const t = useT();
  const td = t.drawers;

  // Required core
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [nav, setNav] = useState("");

  // Legal identity
  const [entityType, setEntityType] = useState("");
  const [jurisdictionCountry, setJurisdictionCountry] = useState("");
  const [jurisdictionState, setJurisdictionState] = useState("");
  const [formationDate, setFormationDate] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [status, setStatus] = useState("Active");

  // Address
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressStateField, setAddressStateField] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressCountry, setAddressCountry] = useState("");

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Tax & compliance
  const [taxClassification, setTaxClassification] = useState("");
  const [fatcaStatus, setFatcaStatus] = useState("");
  const [kycVerifiedDate, setKycVerifiedDate] = useState("");
  const [kycVerifiedBy, setKycVerifiedBy] = useState("");
  const [riskRating, setRiskRating] = useState("");

  // Beneficial owners
  const [owners, setOwners] = useState<BeneficialOwner[]>([]);

  // Financial
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [sourceOfWealth, setSourceOfWealth] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const totalOwnership = useMemo(
    () => owners.reduce((s, o) => s + (Number(o.ownership_pct) || 0), 0),
    [owners]
  );

  const isSubmitting = fetcher.state !== "idle";

  const handleSubmit = () => {
    if (!name.trim() || !/^[A-Z0-9]{2,6}$/.test(short) || isSubmitting) return;

    const cleanOwners: BeneficialOwner[] = owners
      .map((o) => ({
        name: o.name.trim(),
        ownership_pct: Number(o.ownership_pct) || 0,
        role: o.role?.trim() || null,
      }))
      .filter((o) => o.name.length > 0);

    const payload = {
      name: name.trim(),
      short,
      nav: parseFloat(nav) || 0,

      entity_type: entityType || null,
      jurisdiction_country: jurisdictionCountry || null,
      jurisdiction_state: jurisdictionState || null,
      formation_date: formationDate || null,
      tax_id: taxId || null,
      registration_number: registrationNumber || null,
      status: status || null,

      address_street: addressStreet || null,
      address_city: addressCity || null,
      address_state: addressStateField || null,
      address_postal_code: addressPostalCode || null,
      address_country: addressCountry || null,

      contact_name: contactName || null,
      contact_title: contactTitle || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      website: website || null,

      tax_classification: taxClassification || null,
      fatca_status: fatcaStatus || null,
      kyc_verified_date: kycVerifiedDate || null,
      kyc_verified_by: kycVerifiedBy || null,
      risk_rating: riskRating || null,

      beneficial_owners: cleanOwners,

      base_currency: baseCurrency || null,
      source_of_wealth: sourceOfWealth || null,

      notes: notes || null,
    };

    fetcher.submit(
      { intent: "create-entity-full", entity: JSON.stringify(payload) },
      { method: "post", action: "/settings" }
    );
  };

  const resetAndClose = () => {
    setName("");
    setShort("");
    setNav("");
    setEntityType("");
    setJurisdictionCountry("");
    setJurisdictionState("");
    setFormationDate("");
    setTaxId("");
    setRegistrationNumber("");
    setStatus("Active");
    setAddressStreet("");
    setAddressCity("");
    setAddressStateField("");
    setAddressPostalCode("");
    setAddressCountry("");
    setContactName("");
    setContactTitle("");
    setContactEmail("");
    setContactPhone("");
    setWebsite("");
    setTaxClassification("");
    setFatcaStatus("");
    setKycVerifiedDate("");
    setKycVerifiedBy("");
    setRiskRating("");
    setOwners([]);
    setBaseCurrency("USD");
    setSourceOfWealth("");
    setNotes("");
    onClose();
  };

  // Close + reset only after the action confirms success.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      toast(td.entityAdded, "success");
      resetAndClose();
    }
    if (fetcher.state === "idle" && fetcher.data?.error) {
      toast(fetcher.data.error, "warning");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const updateOwner = (i: number, patch: Partial<BeneficialOwner>) =>
    setOwners((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const addOwner = () => setOwners((prev) => [...prev, initialOwner()]);
  const removeOwner = (i: number) =>
    setOwners((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <Drawer open={open} onClose={resetAndClose} title={td.addEntity}>
      <div className="flex flex-col">
        <div className="mb-3"><HelpFootnote tutorial="add-entity" /></div>
        {/* ───────── Required core ───────── */}
        <SectionHeader>{td.coreInfo}</SectionHeader>

        <Label required>{td.entityName}</Label>
        <Input value={name} onChange={setName} maxLength={200} />

        <Label required>{td.entityShort}</Label>
        <Input
          value={short}
          onChange={(v) => setShort(v.toUpperCase().slice(0, 6))}
          maxLength={6}
          placeholder="GFO"
          mono
        />

        <Label required>{td.entityNav}</Label>
        <Input value={nav} onChange={setNav} type="number" mono />

        {/* ───────── Legal identity ───────── */}
        <SectionHeader>{td.legalIdentity}</SectionHeader>

        <Label>{td.entityType}</Label>
        <Select value={entityType} onChange={setEntityType} options={["", ...ENTITY_TYPES]} />

        <Label>{td.jurisdictionCountry}</Label>
        <Input value={jurisdictionCountry} onChange={setJurisdictionCountry} />

        <Label>{td.jurisdictionState}</Label>
        <Input value={jurisdictionState} onChange={setJurisdictionState} />

        <Label>{td.formationDate}</Label>
        <input
          type="date"
          value={formationDate}
          onChange={(e) => setFormationDate(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        <Label>{td.taxId}</Label>
        <Input value={taxId} onChange={setTaxId} mono />

        <Label>{td.registrationNumber}</Label>
        <Input value={registrationNumber} onChange={setRegistrationNumber} mono />

        <Label>{td.entityStatus}</Label>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />

        {/* ───────── Address ───────── */}
        <SectionHeader>{td.registeredAddress}</SectionHeader>

        <Label>{td.street}</Label>
        <Input value={addressStreet} onChange={setAddressStreet} />

        <Label>{td.city}</Label>
        <Input value={addressCity} onChange={setAddressCity} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{td.stateProvince}</Label>
            <Input value={addressStateField} onChange={setAddressStateField} />
          </div>
          <div>
            <Label>{td.postalCode}</Label>
            <Input value={addressPostalCode} onChange={setAddressPostalCode} />
          </div>
        </div>

        <Label>{td.country}</Label>
        <Input value={addressCountry} onChange={setAddressCountry} />

        {/* ───────── Contact ───────── */}
        <SectionHeader>{td.primaryContact}</SectionHeader>

        <Label>{td.contactName}</Label>
        <Input value={contactName} onChange={setContactName} />

        <Label>{td.contactTitle}</Label>
        <Input value={contactTitle} onChange={setContactTitle} />

        <Label>{td.contactEmail}</Label>
        <Input value={contactEmail} onChange={setContactEmail} type="email" />

        <Label>{td.contactPhone}</Label>
        <Input value={contactPhone} onChange={setContactPhone} />

        <Label>{td.website}</Label>
        <Input value={website} onChange={setWebsite} placeholder="https://" />

        {/* ───────── Tax & compliance ───────── */}
        <SectionHeader>{td.taxCompliance}</SectionHeader>

        <Label>{td.taxClassification}</Label>
        <Select
          value={taxClassification}
          onChange={setTaxClassification}
          options={["", ...TAX_CLASS_OPTIONS]}
        />

        <Label>{td.fatcaStatus}</Label>
        <Select
          value={fatcaStatus}
          onChange={setFatcaStatus}
          options={["", ...FATCA_OPTIONS]}
        />

        <Label>{td.kycVerifiedDate}</Label>
        <input
          type="date"
          value={kycVerifiedDate}
          onChange={(e) => setKycVerifiedDate(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        <Label>{td.kycVerifiedBy}</Label>
        <Input value={kycVerifiedBy} onChange={setKycVerifiedBy} />

        <Label>{td.riskRating}</Label>
        <Select
          value={riskRating}
          onChange={setRiskRating}
          options={["", ...RISK_OPTIONS]}
        />

        {/* ───────── Beneficial owners ───────── */}
        <SectionHeader>
          {td.beneficialOwners}
          {owners.length > 0 && (
            <span
              className={`ml-2 text-[10px] font-mono font-semibold ${
                totalOwnership > 100.5 ? "text-red-400" : "text-atlas-gray3"
              }`}
            >
              {totalOwnership.toFixed(1)}%
            </span>
          )}
        </SectionHeader>

        {owners.length === 0 && (
          <div className="text-[11px] text-atlas-gray4 mb-3">
            {td.noBeneficialOwners}
          </div>
        )}

        {owners.map((o, i) => (
          <div
            key={i}
            className="bg-atlas-card border border-atlas-border rounded-[8px] p-3 mb-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-atlas-gray3 uppercase tracking-widest">
                {td.owner} #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeOwner(i)}
                className="text-atlas-gray4 hover:text-red-400 text-xs cursor-pointer"
                title={td.remove}
              >
                &times;
              </button>
            </div>
            <input
              value={o.name}
              onChange={(e) => updateOwner(i, { name: e.target.value })}
              placeholder={td.ownerName}
              maxLength={200}
              className="bg-atlas-surface border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none focus:border-atlas-purple transition-colors"
            />
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <input
                value={o.role ?? ""}
                onChange={(e) => updateOwner(i, { role: e.target.value })}
                placeholder={td.ownerRole}
                maxLength={200}
                className="bg-atlas-surface border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none focus:border-atlas-purple transition-colors"
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={o.ownership_pct}
                onChange={(e) =>
                  updateOwner(i, { ownership_pct: Number(e.target.value) || 0 })
                }
                placeholder="%"
                className="bg-atlas-surface border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none focus:border-atlas-purple transition-colors font-mono"
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addOwner}
          className="px-3 py-2 mb-4 rounded-md border border-dashed border-atlas-border text-[11px] font-semibold text-atlas-gray3 hover:border-atlas-purple hover:text-atlas-purple cursor-pointer transition-colors"
        >
          + {td.addOwner}
        </button>

        {/* ───────── Financial ───────── */}
        <SectionHeader>{td.financial}</SectionHeader>

        <Label>{td.baseCurrency}</Label>
        <Select value={baseCurrency} onChange={setBaseCurrency} options={CURRENCIES} />

        <Label>{td.sourceOfWealth}</Label>
        <textarea
          value={sourceOfWealth}
          onChange={(e) => setSourceOfWealth(e.target.value)}
          rows={3}
          maxLength={4000}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none resize-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        {/* ───────── Notes ───────── */}
        <SectionHeader>{td.notes}</SectionHeader>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={4000}
          className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none resize-none focus:border-atlas-purple transition-colors mb-3.5"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={
            !name.trim() ||
            !/^[A-Z0-9]{2,6}$/.test(short) ||
            isSubmitting
          }
          className="w-full mt-5 py-2.5 rounded-lg bg-atlas-purple text-atlas-white text-[13px] font-semibold cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "…" : td.save}
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold text-atlas-purple uppercase tracking-widest mt-2 mb-3 pb-1.5 border-b border-atlas-border flex items-center">
      {children}
    </div>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
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
  type = "text",
  maxLength,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      className={`bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple transition-colors mb-3.5 ${
        mono ? "font-mono" : ""
      } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-atlas-card border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none cursor-pointer appearance-none focus:border-atlas-purple transition-colors mb-3.5"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}

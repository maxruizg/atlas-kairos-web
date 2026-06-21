import { useState, useEffect, useRef } from "react";
import { Drawer } from "~/components/ui/Drawer";
import { useEntity } from "~/lib/entity-context";
import { useToast } from "~/lib/toast-context";
import { useLang } from "~/lib/lang-context";
import { useClientData } from "~/lib/client-data-context";
import { useGuard } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";
import { HelpFootnote } from "~/components/ui/HelpFootnote";
import type { DirectInvestment, RiskRating } from "~/lib/types";
import {
  Section,
  Label,
  TextField,
  NumberField,
  DateField,
  SelectField,
  ReadOnlyField,
  RiskSelector,
} from "~/components/drawers/form-fields";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TODAY = "2026-06-03";

/** Strip thousands separators / spaces so "1,000,000" parses as a number. */
const clean = (s: string) => String(s).replace(/[,\s]/g, "");

function numError(raw: string): boolean {
  if (raw.trim() === "") return false;
  const n = Number(clean(raw));
  return Number.isNaN(n) || n < 0;
}

export function AddDirectInvestmentDrawer({ open, onClose }: Props) {
  const { entities } = useEntity();
  const { toast } = useToast();
  const { lang } = useLang();
  const t = useT();
  const td = t.drawers;
  const { taxonomy, addDirect, logAudit } = useClientData();
  const guard = useGuard();
  const firstRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [sector, setSector] = useState(taxonomy.sectors[0] || "");
  const [assetClass, setAssetClass] = useState(taxonomy.directAssetClasses[0] || "");
  const [geography, setGeography] = useState("Latin America");
  const [currency, setCurrency] = useState("USD");
  const [entityId, setEntityId] = useState(entities[0]?.id || "");
  const [investmentDate, setInvestmentDate] = useState(TODAY);
  const [cost, setCost] = useState("");
  const [valuation, setValuation] = useState("");
  const [valuationDate, setValuationDate] = useState(TODAY);
  const [ownership, setOwnership] = useState("");
  const [stage, setStage] = useState(taxonomy.directStages[0] || "");
  const [risk, setRisk] = useState<RiskRating>("green");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => firstRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [open]);

  const num = (s: string) => parseFloat(clean(s)) || 0;
  const moic = num(cost) > 0 ? num(valuation) / num(cost) : 0;

  const errs = {
    name: submitted && !name.trim() ? td.requiredField : undefined,
    entity: submitted && !entityId ? td.requiredField : undefined,
    cost: numError(cost) ? td.invalidNumber : undefined,
    valuation: numError(valuation) ? td.invalidNumber : undefined,
    ownership: numError(ownership) ? td.invalidNumber : undefined,
  };
  const hasErrors = Object.values(errs).some(Boolean);

  const reset = () => {
    setName(""); setCost(""); setValuation(""); setOwnership("");
    setInvestmentDate(TODAY); setValuationDate(TODAY); setRisk("green");
    setSubmitted(false);
  };

  const build = (): DirectInvestment => ({
    id: `d-${crypto.randomUUID().slice(0, 8)}`,
    entity_id: entityId,
    name: name.trim(),
    sector,
    asset_class: assetClass,
    geography,
    currency,
    investment_date: investmentDate,
    cost: num(cost),
    valuation: num(valuation),
    valuation_date: valuationDate,
    ownership_pct: num(ownership),
    stage,
    risk_rating: risk,
    net_irr: 0,
    distributions: 0,
    valuation_history: [
      { date: investmentDate, value: num(cost), note: "Entry cost" },
      ...(num(valuation) > 0 && valuationDate !== investmentDate
        ? [{ date: valuationDate, value: num(valuation), note: "Initial valuation" }]
        : []),
    ],
    nav_history: [
      { q: investmentDate.slice(0, 4), nav: num(cost) },
      ...(num(valuation) > 0 ? [{ q: valuationDate.slice(0, 4), nav: num(valuation) }] : []),
    ],
  });

  const commit = (keepOpen: boolean) => {
    setSubmitted(true);
    if (!name.trim() || !entityId || hasErrors) {
      // The original bug returned here silently — no toast, no POST, panel
      // stuck open. Always tell the user exactly what is blocking the save.
      const msg = !name.trim()
        ? td.requiredField
        : !entityId
        ? entities.length === 0
          ? lang === "es"
            ? "Crea una entidad antes de agregar una inversión."
            : "Create an entity before adding an investment."
          : td.requiredField
        : lang === "es"
        ? "Revisa los campos marcados en rojo."
        : "Check the fields highlighted in red.";
      toast(msg, "warning");
      return;
    }
    guard("direct.add", () => {
      const d = build();
      addDirect(d);
      logAudit({
        action: "create",
        entity: d.name,
        field: "direct-investment",
        new_value: `${d.asset_class} · ${d.sector} · ${d.currency} ${(d.valuation / 1e6).toFixed(1)}MM`,
        screen: "Add Direct Investment",
      });
      toast(td.directAdded, "success");
      if (keepOpen) {
        reset();
        firstRef.current?.focus();
      } else {
        reset();
        onClose();
      }
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={td.addDirect}>
      <div className="flex flex-col">
        <div className="mb-3"><HelpFootnote tutorial="add-direct" /></div>
        <Section>{td.secIdentity}</Section>

        <Label required>{td.companyAssetName}</Label>
        <TextField ref={firstRef} value={name} onChange={setName} error={errs.name} maxLength={120} />

        <Label>{td.entityAssignment}</Label>
        <SelectField
          value={entityId}
          onChange={setEntityId}
          options={entities.map((e) => e.id)}
          labels={entities.map((e) => `${e.short} — ${e.name}`)}
          error={errs.entity}
        />

        <Section>{td.secClassification}</Section>

        <Label>{td.sector}</Label>
        <SelectField value={sector} onChange={setSector} options={taxonomy.sectors} />

        <Label>{td.directAssetClass}</Label>
        <SelectField value={assetClass} onChange={setAssetClass} options={taxonomy.directAssetClasses} />

        <Label>{td.stage}</Label>
        <SelectField value={stage} onChange={setStage} options={taxonomy.directStages} />

        <Label>{td.geography}</Label>
        <SelectField value={geography} onChange={setGeography} options={taxonomy.geographies} />

        <Label>{td.currency}</Label>
        <SelectField value={currency} onChange={setCurrency} options={taxonomy.currencies} />

        <Section>{td.secEconomics}</Section>

        <Label>{td.investmentDate}</Label>
        <DateField value={investmentDate} onChange={setInvestmentDate} />

        <Label>{td.cost}</Label>
        <NumberField value={cost} onChange={setCost} error={errs.cost} />

        <Label>{td.currentValuation}</Label>
        <NumberField value={valuation} onChange={setValuation} error={errs.valuation} />

        <Label>{td.valuationDate}</Label>
        <DateField value={valuationDate} onChange={setValuationDate} />

        <Label>{td.ownershipPct}</Label>
        <NumberField value={ownership} onChange={setOwnership} error={errs.ownership} />

        <Label>MOIC</Label>
        <ReadOnlyField value={moic.toFixed(2) + "x"} />

        <Section>{td.secRisk}</Section>
        <Label>{t.drawers.riskRating}</Label>
        <RiskSelector value={risk} onChange={setRisk} />

        <button
          onClick={() => commit(false)}
          className="w-full mt-4 py-2.5 rounded-lg bg-atlas-purple text-atlas-white text-[13px] font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
        >
          {td.save}
        </button>
        <button
          onClick={() => commit(true)}
          className="w-full mt-2 py-2.5 rounded-lg bg-atlas-purple-dim text-atlas-purple text-[13px] font-semibold cursor-pointer border border-atlas-purple/40 hover:bg-atlas-purple/20 transition-colors"
        >
          {td.saveAndAnother}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 rounded-lg bg-transparent border border-atlas-border text-atlas-gray2 text-[13px] font-medium cursor-pointer hover:border-atlas-gray4 transition-colors"
        >
          {td.cancel}
        </button>
      </div>
    </Drawer>
  );
}

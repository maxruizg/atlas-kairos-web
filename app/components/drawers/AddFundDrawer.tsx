import { useState, useMemo, useEffect, useRef } from "react";
import { Drawer } from "~/components/ui/Drawer";
import { useEntity } from "~/lib/entity-context";
import { useToast } from "~/lib/toast-context";
import { useLang } from "~/lib/lang-context";
import { useClientData } from "~/lib/client-data-context";
import { useGuard } from "~/lib/use-permissions";
import { strategiesFor } from "~/lib/taxonomy";
import { useT } from "~/lib/use-t";
import { HelpFootnote } from "~/components/ui/HelpFootnote";
import type { Fund, RiskRating } from "~/lib/types";
import {
  Section,
  Label,
  TextField,
  NumberField,
  SelectField,
  ReadOnlyField,
  RiskSelector,
} from "~/components/drawers/form-fields";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided (from a Sponsor detail page) the fund is attached to that
   *  sponsor. When omitted (e.g. from the Sponsors list / Portfolio) the user
   *  picks the sponsor inside the drawer. */
  sponsorId?: string;
}

const CURRENT_YEAR = 2026;

/** Strip thousands separators / spaces so "25,000,000" parses as a number. */
const clean = (s: string) => String(s).replace(/[,\s]/g, "");

/** Validate a numeric string: empty is OK, otherwise must be a number and
 *  (unless allowNegative) non-negative. Returns an error key or null. */
function numError(raw: string, allowNegative: boolean): "invalid" | null {
  if (raw.trim() === "") return null;
  const n = Number(clean(raw));
  if (Number.isNaN(n)) return "invalid";
  if (!allowNegative && n < 0) return "invalid";
  return null;
}

export function AddFundDrawer({ open, onClose, sponsorId }: Props) {
  const { entities } = useEntity();
  const { toast } = useToast();
  const { lang } = useLang();
  const t = useT();
  const td = t.drawers;
  const { taxonomy, sponsors, addFund, logAudit } = useClientData();
  const guard = useGuard();

  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Sponsor: fixed by the caller (Sponsor detail), or picked here when the
  // drawer is opened from a list/portfolio view.
  const [sponsorPick, setSponsorPick] = useState(sponsorId ?? sponsors[0]?.id ?? "");
  const effectiveSponsorId = sponsorId ?? sponsorPick;

  // Classification (dropdowns)
  const [assetClass, setAssetClass] = useState(taxonomy.assetClasses[0] || "");
  const [strategy, setStrategy] = useState("");
  const [subTheme, setSubTheme] = useState(taxonomy.subThemes[0] || "");
  const [geography, setGeography] = useState("Global");
  const [currency, setCurrency] = useState("USD");
  const [entityId, setEntityId] = useState(entities[0]?.id || "");
  const [ticketSize, setTicketSize] = useState(taxonomy.ticketSizes[1] || "");
  const [fundSize, setFundSize] = useState(taxonomy.fundSizes[2] || "");

  // Identity
  const [name, setName] = useState("");
  const [vintage, setVintage] = useState(String(CURRENT_YEAR));

  // Economics
  const [commitment, setCommitment] = useState("");
  const [paidIn, setPaidIn] = useState("");
  const [nav, setNav] = useState("");
  const [distributions, setDistributions] = useState("");
  const [unfunded, setUnfunded] = useState("");

  // Performance
  const [grossIrr, setGrossIrr] = useState("");
  const [netIrr, setNetIrr] = useState("");
  const [grossMoic, setGrossMoic] = useState("");
  const [netMoic, setNetMoic] = useState("");
  const [reportQ, setReportQ] = useState("");

  // Risk
  const [risk, setRisk] = useState<RiskRating>("green");

  const [submitted, setSubmitted] = useState(false);

  // Dependent strategy options — refresh when asset class changes.
  const strategyOptions = useMemo(
    () => strategiesFor(taxonomy, assetClass),
    [taxonomy, assetClass]
  );
  useEffect(() => {
    if (strategyOptions.length && !strategyOptions.includes(strategy)) {
      setStrategy(strategyOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetClass]);

  // Auto-focus first field on open.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => firstFieldRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [open]);

  const num = (s: string) => parseFloat(clean(s)) || 0;
  const paidInNum = num(paidIn);
  const commitmentNum = num(commitment);
  const navNum = num(nav);
  const distNum = num(distributions);

  const pctCalled = commitmentNum > 0 ? (paidInNum / commitmentNum) * 100 : 0;
  const tvpi = paidInNum > 0 ? (distNum + navNum) / paidInNum : 0;
  const dpi = paidInNum > 0 ? distNum / paidInNum : 0;
  const rvpi = paidInNum > 0 ? navNum / paidInNum : 0;

  // Field-level errors (numbers + required).
  const errs = {
    name: submitted && !name.trim() ? td.requiredField : undefined,
    vintage: submitted && !vintage.trim() ? td.requiredField : undefined,
    entity: submitted && !entityId ? td.requiredField : undefined,
    commitment: numError(commitment, false) ? td.invalidNumber : undefined,
    paidIn: numError(paidIn, false) ? td.invalidNumber : undefined,
    nav: numError(nav, false) ? td.invalidNumber : undefined,
    distributions: numError(distributions, false) ? td.invalidNumber : undefined,
    unfunded: numError(unfunded, false) ? td.invalidNumber : undefined,
    grossIrr: numError(grossIrr, true) ? td.invalidNumber : undefined,
    netIrr: numError(netIrr, true) ? td.invalidNumber : undefined,
    grossMoic: numError(grossMoic, false) ? td.invalidNumber : undefined,
    netMoic: numError(netMoic, false) ? td.invalidNumber : undefined,
  };
  const hasErrors = Object.values(errs).some(Boolean);

  const resetFields = () => {
    setName("");
    setVintage(String(CURRENT_YEAR));
    setCommitment(""); setPaidIn(""); setNav(""); setDistributions(""); setUnfunded("");
    setGrossIrr(""); setNetIrr(""); setGrossMoic(""); setNetMoic("");
    setReportQ(""); setRisk("green");
    setSubmitted(false);
  };

  const build = (): Fund => ({
    id: `f-${crypto.randomUUID().slice(0, 8)}`,
    sponsor_id: effectiveSponsorId,
    entity_id: entityId,
    name: name.trim(),
    vintage: parseInt(vintage) || CURRENT_YEAR,
    strategy: strategy || strategyOptions[0] || "",
    asset_class: assetClass,
    sub_theme: subTheme,
    ticket_size: ticketSize,
    fund_size: fundSize,
    geography,
    currency,
    commitment: commitmentNum,
    paid_in: paidInNum,
    nav: navNum,
    distributions: distNum,
    unfunded: num(unfunded),
    tvpi, dpi, rvpi, pct_called: pctCalled,
    gross_irr: num(grossIrr),
    net_irr: num(netIrr),
    gross_moic: num(grossMoic),
    net_moic: num(netMoic),
    latest_report_q: reportQ || `Q4 ${CURRENT_YEAR - 1}`,
    report_received: false,
    risk_rating: risk,
    transactions: [],
    companies: [],
    nav_history: [],
    cashflows: [],
    capital_log: [],
  });

  const commit = (keepOpen: boolean) => {
    setSubmitted(true);
    if (!name.trim() || !vintage.trim() || !entityId || !effectiveSponsorId || hasErrors) {
      // Never fail silently — surface exactly what's blocking the save.
      const msg = !effectiveSponsorId
        ? lang === "es"
          ? "Selecciona un sponsor."
          : "Select a sponsor."
        : !name.trim() || !vintage.trim()
        ? td.requiredField
        : !entityId
        ? entities.length === 0
          ? lang === "es"
            ? "Crea una entidad antes de agregar un fondo."
            : "Create an entity before adding a fund."
          : td.requiredField
        : lang === "es"
        ? "Revisa los campos marcados en rojo."
        : "Check the fields highlighted in red.";
      toast(msg, "warning");
      return;
    }
    guard("fund.add", () => {
      const fund = build();
      addFund(fund);
      logAudit({
        action: "create",
        entity: fund.name,
        field: "fund",
        new_value: `${fund.asset_class} · ${fund.currency} ${fund.nav}MM NAV`,
        screen: "Add Fund",
      });
      toast(td.fundAdded, "success");
      if (keepOpen) {
        resetFields();
        firstFieldRef.current?.focus();
      } else {
        resetFields();
        onClose();
      }
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={td.addFund}>
      <div className="flex flex-col">
        <div className="mb-3"><HelpFootnote tutorial="add-fund" /></div>
        <Section>{td.secIdentity}</Section>

        {!sponsorId && (
          <>
            <Label required>{lang === "es" ? "Patrocinador" : "Sponsor"}</Label>
            <SelectField
              value={sponsorPick}
              onChange={setSponsorPick}
              options={sponsors.map((s) => s.id)}
              labels={sponsors.map((s) => s.name)}
              placeholder={
                sponsors.length === 0
                  ? lang === "es"
                    ? "Agrega un sponsor primero"
                    : "Add a sponsor first"
                  : undefined
              }
            />
          </>
        )}

        <Label required>{td.fundName}</Label>
        <TextField ref={firstFieldRef} value={name} onChange={setName} error={errs.name} maxLength={120} />

        <Label required>{td.vintageYear}</Label>
        <NumberField value={vintage} onChange={setVintage} error={errs.vintage} />

        <Label>{td.entityAssignment}</Label>
        <SelectField
          value={entityId}
          onChange={setEntityId}
          options={entities.map((e) => e.id)}
          labels={entities.map((e) => `${e.short} — ${e.name}`)}
          error={errs.entity}
        />

        <Section>{td.secClassification}</Section>

        <Label>{td.assetClass}</Label>
        <SelectField value={assetClass} onChange={setAssetClass} options={taxonomy.assetClasses} />

        <Label>{td.strategy}</Label>
        <SelectField value={strategy} onChange={setStrategy} options={strategyOptions} />

        <Label>{td.subTheme}</Label>
        <SelectField value={subTheme} onChange={setSubTheme} options={taxonomy.subThemes} />

        <Label>{td.geography}</Label>
        <SelectField value={geography} onChange={setGeography} options={taxonomy.geographies} />

        <Label>{td.currency}</Label>
        <SelectField value={currency} onChange={setCurrency} options={taxonomy.currencies} />

        <Label>{td.ticketSize}</Label>
        <SelectField value={ticketSize} onChange={setTicketSize} options={taxonomy.ticketSizes} />

        <Label>{td.fundSize}</Label>
        <SelectField value={fundSize} onChange={setFundSize} options={taxonomy.fundSizes} />

        <Section>{td.secEconomics}</Section>

        <Label>{td.commitment}</Label>
        <NumberField value={commitment} onChange={setCommitment} error={errs.commitment} />

        <Label>{td.paidIn}</Label>
        <NumberField value={paidIn} onChange={setPaidIn} error={errs.paidIn} />

        <Label>{td.navLabel}</Label>
        <NumberField value={nav} onChange={setNav} error={errs.nav} />

        <Label>{td.distributions}</Label>
        <NumberField value={distributions} onChange={setDistributions} error={errs.distributions} />

        <Label>{td.unfunded}</Label>
        <NumberField value={unfunded} onChange={setUnfunded} error={errs.unfunded} />

        <Label>{td.pctCalled}</Label>
        <ReadOnlyField value={`${pctCalled.toFixed(1)}%`} />

        <Section>{td.secPerformance}</Section>

        <Label>{td.grossIrr}</Label>
        <NumberField value={grossIrr} onChange={setGrossIrr} error={errs.grossIrr} allowNegative />

        <Label>{td.netIrr}</Label>
        <NumberField value={netIrr} onChange={setNetIrr} error={errs.netIrr} allowNegative />

        <Label>{td.grossMoic}</Label>
        <NumberField value={grossMoic} onChange={setGrossMoic} error={errs.grossMoic} />

        <Label>{td.netMoic}</Label>
        <NumberField value={netMoic} onChange={setNetMoic} error={errs.netMoic} />

        <div className="grid grid-cols-3 gap-2 mb-1">
          <div><Label>TVPI</Label><ReadOnlyField value={tvpi.toFixed(2) + "x"} /></div>
          <div><Label>DPI</Label><ReadOnlyField value={dpi.toFixed(2) + "x"} /></div>
          <div><Label>RVPI</Label><ReadOnlyField value={rvpi.toFixed(2) + "x"} /></div>
        </div>

        <Label>{td.latestReportQ}</Label>
        <TextField value={reportQ} onChange={setReportQ} placeholder={`Q4 ${CURRENT_YEAR - 1}`} />

        <Section>{td.secRisk}</Section>
        <Label>{td.riskRating}</Label>
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

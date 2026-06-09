import { useState } from "react";
import { useClientData } from "~/lib/client-data-context";
import { useCan } from "~/lib/use-permissions";
import { useToast } from "~/lib/toast-context";
import { useLang } from "~/lib/lang-context";
import type { TaxonomyLists } from "~/lib/types";

type FlatList = Exclude<keyof TaxonomyLists, "strategies" | "riskRatings">;

const FLAT_LISTS: { key: FlatList; en: string; es: string }[] = [
  { key: "assetClasses", en: "Asset Classes", es: "Clases de Activo" },
  { key: "subThemes", en: "Sub-Themes", es: "Sub-Temas" },
  { key: "geographies", en: "Geographies", es: "Geografías" },
  { key: "currencies", en: "Currencies", es: "Monedas" },
  { key: "sectors", en: "Sectors (Direct)", es: "Sectores (Directas)" },
  { key: "directAssetClasses", en: "Direct Asset Classes", es: "Clases (Directas)" },
  { key: "directStages", en: "Direct Stages", es: "Etapas (Directas)" },
  { key: "ticketSizes", en: "Ticket Size Ranges", es: "Rangos de Ticket" },
  { key: "fundSizes", en: "Fund Size Ranges", es: "Rangos de Tamaño" },
];

/** Editable controlled-vocabulary manager. Adds flow straight into every
 *  Add-Fund / Add-Direct dropdown via the shared store. */
export function TaxonomySection() {
  const { taxonomy, addTaxonomyItem, deleteTaxonomyItem, logAudit } = useClientData();
  const cn = useCan();
  const { toast } = useToast();
  const { lang } = useLang();
  const L = (en: string, es: string) => (lang === "es" ? es : en);

  const canAdd = cn("taxonomy.add");
  const canManage = cn("taxonomy.manage");

  if (!canAdd && !canManage) return null;

  return (
    <div className="bg-atlas-card border border-atlas-border rounded-xl p-5">
      <h2 className="text-[10px] font-semibold text-atlas-gray4 uppercase tracking-widest mb-1">
        {L("Taxonomy Lists", "Listas de Taxonomía")}
      </h2>
      <p className="text-[11px] text-atlas-gray4 mb-4">
        {L(
          "Manage the dropdown lists used across Add Fund and Add Direct Investment. Changes apply instantly.",
          "Gestiona las listas usadas en Agregar Fondo e Inversión Directa. Los cambios aplican al instante."
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strategies, keyed by asset class */}
        <StrategyEditor canAdd={canAdd} canManage={canManage} />

        {FLAT_LISTS.map((l) => (
          <ListEditor
            key={l.key}
            title={L(l.en, l.es)}
            items={(taxonomy[l.key] as string[]) || []}
            canAdd={canAdd}
            canManage={canManage}
            onAdd={(v) => {
              addTaxonomyItem(l.key, v);
              logAudit({ action: "create", entity: L(l.en, l.es), field: "taxonomy", new_value: v, screen: "Settings" });
              toast(L("Added.", "Agregado."), "success");
            }}
            onDelete={(v) => {
              deleteTaxonomyItem(l.key, v);
              logAudit({ action: "delete", entity: L(l.en, l.es), field: "taxonomy", old_value: v, screen: "Settings" });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyEditor({ canAdd, canManage }: { canAdd: boolean; canManage: boolean }) {
  const { taxonomy, addTaxonomyItem, deleteTaxonomyItem, logAudit } = useClientData();
  const { lang } = useLang();
  const { toast } = useToast();
  const L = (en: string, es: string) => (lang === "es" ? es : en);
  const [ac, setAc] = useState(taxonomy.assetClasses[0] || "");
  const list = taxonomy.strategies[ac] || [];

  return (
    <div className="bg-atlas-surface border border-atlas-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-atlas-white">{L("Strategies", "Estrategias")}</span>
        <select
          value={ac}
          onChange={(e) => setAc(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded px-2 py-1 text-[10px] text-atlas-off-white outline-none cursor-pointer"
        >
          {taxonomy.assetClasses.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <Chips
        items={list}
        canManage={canManage}
        onDelete={(v) => {
          deleteTaxonomyItem("strategies", v, ac);
          logAudit({ action: "delete", entity: `Strategy (${ac})`, field: "taxonomy", old_value: v, screen: "Settings" });
        }}
      />
      {canAdd && (
        <AddInline
          onAdd={(v) => {
            addTaxonomyItem("strategies", v, ac);
            logAudit({ action: "create", entity: `Strategy (${ac})`, field: "taxonomy", new_value: v, screen: "Settings" });
            toast(L("Added.", "Agregado."), "success");
          }}
        />
      )}
    </div>
  );
}

function ListEditor({
  title, items, canAdd, canManage, onAdd, onDelete,
}: {
  title: string;
  items: string[];
  canAdd: boolean;
  canManage: boolean;
  onAdd: (v: string) => void;
  onDelete: (v: string) => void;
}) {
  return (
    <div className="bg-atlas-surface border border-atlas-border rounded-lg p-3">
      <div className="text-[11px] font-bold text-atlas-white mb-2">{title}</div>
      <Chips items={items} canManage={canManage} onDelete={onDelete} />
      {canAdd && <AddInline onAdd={onAdd} />}
    </div>
  );
}

function Chips({ items, canManage, onDelete }: { items: string[]; canManage: boolean; onDelete: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {items.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-atlas-card border border-atlas-border text-[10.5px] text-atlas-gray2">
          {v}
          {canManage && (
            <button
              onClick={() => onDelete(v)}
              className="text-atlas-gray4 hover:text-atlas-red cursor-pointer leading-none"
              title="Delete"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {items.length === 0 && <span className="text-[10px] text-atlas-gray4 italic">—</span>}
    </div>
  );
}

function AddInline({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal("");
  };
  return (
    <div className="flex gap-1.5">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="+ add"
        className="flex-1 bg-atlas-card border border-atlas-border rounded px-2 py-1 text-[11px] text-atlas-off-white outline-none focus:border-atlas-purple"
      />
      <button onClick={submit} className="px-2.5 py-1 rounded bg-atlas-purple text-atlas-white text-[11px] font-semibold cursor-pointer border-none">
        +
      </button>
    </div>
  );
}

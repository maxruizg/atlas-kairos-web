import { useState, useEffect } from "react";
import { useNavigate, useLoaderData, useFetcher } from "react-router";
import { api } from "~/lib/api.server";
import { useTheme } from "~/lib/theme-context";
import { useLang } from "~/lib/lang-context";
import { useAuth } from "~/lib/auth-context";
import { useT } from "~/lib/use-t";
import { formatCurrency } from "~/lib/utils";
import type { Entity } from "~/lib/types";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000`;
}

interface LoaderData {
  entities: Entity[];
  fundCountByEntity: Record<string, number>;
}

export async function loader(): Promise<LoaderData> {
  const [entities, funds] = await Promise.all([
    api.getEntities(),
    api.getFunds(),
  ]);
  const fundCountByEntity: Record<string, number> = {};
  for (const e of entities) fundCountByEntity[e.id] = 0;
  for (const f of funds) {
    fundCountByEntity[f.entity_id] = (fundCountByEntity[f.entity_id] || 0) + 1;
  }
  return { entities, fundCountByEntity };
}

interface ActionData {
  intent: "create" | "delete";
  ok: boolean;
  error?: string;
}

export async function action({
  request,
}: {
  request: Request;
}): Promise<ActionData> {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "create") {
    const name = String(form.get("name") || "").trim();
    const short = String(form.get("short") || "")
      .trim()
      .toUpperCase();
    const navRaw = String(form.get("nav") || "0").trim();
    const nav = Number(navRaw);

    if (!name) return { intent: "create", ok: false, error: "Name is required" };
    if (!/^[A-Z0-9]{2,6}$/.test(short)) {
      return {
        intent: "create",
        ok: false,
        error: "Short code must be 2–6 uppercase letters or digits",
      };
    }
    if (!Number.isFinite(nav) || nav < 0) {
      return {
        intent: "create",
        ok: false,
        error: "NAV must be a non-negative number",
      };
    }

    const result = await api.createEntity({ name, short, nav });
    if (!result.ok) return { intent: "create", ok: false, error: result.error };
    return { intent: "create", ok: true };
  }

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    if (!id) return { intent: "delete", ok: false, error: "Missing entity id" };
    const result = await api.deleteEntity(id);
    if (!result.ok) return { intent: "delete", ok: false, error: result.error };
    return { intent: "delete", ok: true };
  }

  return { intent: "create", ok: false, error: "Unknown intent" };
}

export default function SettingsPage() {
  const { entities, fundCountByEntity } = useLoaderData() as LoaderData;
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLang();
  const { logout } = useAuth();
  const t = useT();
  const navigate = useNavigate();

  // Cookie-persisted UI preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [reviewReminders, setReviewReminders] = useState(true);
  const [uploadAlerts, setUploadAlerts] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [numberFormat, setNumberFormat] = useState("1,000.00");

  useEffect(() => {
    setEmailAlerts(getCookie("atlas-email-alerts") !== "false");
    setReviewReminders(getCookie("atlas-review-reminders") !== "false");
    setUploadAlerts(getCookie("atlas-upload-alerts") === "true");
    setCurrency(getCookie("atlas-currency") || "USD");
    setDateFormat(getCookie("atlas-date-format") || "MM/DD/YYYY");
    setNumberFormat(getCookie("atlas-number-format") || "1,000.00");
  }, []);

  function toggleNotif(key: string, value: boolean, setter: (v: boolean) => void) {
    setter(value);
    setCookie(key, String(value));
  }

  function handleSignOut() {
    logout();
    navigate("/login");
  }

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-atlas-white font-display">{t.settings.title}</h1>

        {/* Profile */}
        <Section title={t.settings.profile}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-atlas-purple-dim border border-atlas-purple flex items-center justify-center text-base text-atlas-purple font-bold">
              CG
            </div>
            <div>
              <div className="text-sm font-semibold text-atlas-white">Carlos González</div>
              <div className="text-xs text-atlas-gray3">carlos@gonzalezfo.com</div>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title={t.settings.appearance}>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-atlas-gray4 mb-2">{t.settings.theme}</div>
              <div className="flex gap-2">
                <ToggleButton active={theme === "dark"} onClick={() => { if (theme === "light") toggleTheme(); }}>{t.settings.dark}</ToggleButton>
                <ToggleButton active={theme === "light"} onClick={() => { if (theme === "dark") toggleTheme(); }}>{t.settings.light}</ToggleButton>
              </div>
            </div>
            <div>
              <div className="text-xs text-atlas-gray4 mb-2">{t.settings.language}</div>
              <div className="flex gap-2">
                <ToggleButton active={lang === "en"} onClick={() => setLang("en")}>EN</ToggleButton>
                <ToggleButton active={lang === "es"} onClick={() => setLang("es")}>ES</ToggleButton>
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title={t.settings.notifications}>
          <div className="flex flex-col gap-4">
            <ToggleSwitch
              label={t.settings.emailAlerts}
              description={t.settings.emailAlertsDesc}
              checked={emailAlerts}
              onChange={(v) => toggleNotif("atlas-email-alerts", v, setEmailAlerts)}
            />
            <ToggleSwitch
              label={t.settings.reviewReminders}
              description={t.settings.reviewRemindersDesc}
              checked={reviewReminders}
              onChange={(v) => toggleNotif("atlas-review-reminders", v, setReviewReminders)}
            />
            <ToggleSwitch
              label={t.settings.uploadAlerts}
              description={t.settings.uploadAlertsDesc}
              checked={uploadAlerts}
              onChange={(v) => toggleNotif("atlas-upload-alerts", v, setUploadAlerts)}
            />
          </div>
        </Section>

        {/* Data & Display */}
        <Section title={t.settings.dataDisplay}>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-atlas-gray4 mb-2">{t.settings.defaultCurrency}</div>
              <div className="flex gap-2">
                <ToggleButton active={currency === "USD"} onClick={() => { setCurrency("USD"); setCookie("atlas-currency", "USD"); }}>USD</ToggleButton>
                <ToggleButton active={currency === "EUR"} onClick={() => { setCurrency("EUR"); setCookie("atlas-currency", "EUR"); }}>EUR</ToggleButton>
              </div>
            </div>
            <div>
              <div className="text-xs text-atlas-gray4 mb-2">{t.settings.dateFormat}</div>
              <div className="flex gap-2">
                <ToggleButton active={dateFormat === "MM/DD/YYYY"} onClick={() => { setDateFormat("MM/DD/YYYY"); setCookie("atlas-date-format", "MM/DD/YYYY"); }}>MM/DD/YYYY</ToggleButton>
                <ToggleButton active={dateFormat === "DD/MM/YYYY"} onClick={() => { setDateFormat("DD/MM/YYYY"); setCookie("atlas-date-format", "DD/MM/YYYY"); }}>DD/MM/YYYY</ToggleButton>
              </div>
            </div>
            <div>
              <div className="text-xs text-atlas-gray4 mb-2">{t.settings.numberFormat}</div>
              <div className="flex gap-2">
                <ToggleButton active={numberFormat === "1,000.00"} onClick={() => { setNumberFormat("1,000.00"); setCookie("atlas-number-format", "1,000.00"); }}>1,000.00</ToggleButton>
                <ToggleButton active={numberFormat === "1.000,00"} onClick={() => { setNumberFormat("1.000,00"); setCookie("atlas-number-format", "1.000,00"); }}>1.000,00</ToggleButton>
              </div>
            </div>
          </div>
        </Section>

        {/* Entities */}
        <EntitiesSection
          entities={entities}
          fundCountByEntity={fundCountByEntity}
        />

        {/* About */}
        <Section title={t.settings.about}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="text-atlas-gray3">
              <span className="text-atlas-gray4">{t.settings.version}:</span> Atlas v1.0
            </div>
            <div className="text-atlas-gray3">
              <span className="text-atlas-gray4">{t.settings.buildInfo}:</span> 2026.03.01
            </div>
            <div className="text-atlas-gray4 text-xs mt-1">{t.footer.confidential}</div>
          </div>
        </Section>

        {/* Sign Out */}
        <div>
          <button
            onClick={handleSignOut}
            className="px-5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold cursor-pointer hover:bg-red-500/20 transition-colors"
          >
            {t.settings.signOut}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-xl p-5">
      <h2 className="text-[10px] font-semibold text-atlas-gray4 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-[7px] rounded-lg text-xs font-semibold cursor-pointer transition-colors border ${
        active
          ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
          : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm text-atlas-white">{label}</div>
        <div className="text-xs text-atlas-gray4 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full cursor-pointer border-none transition-colors shrink-0 ${
          checked ? "bg-atlas-purple" : "bg-atlas-border"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function EntitiesSection({
  entities,
  fundCountByEntity,
}: {
  entities: Entity[];
  fundCountByEntity: Record<string, number>;
}) {
  const t = useT();
  const ts = t.settings;
  const createFetcher = useFetcher<ActionData>();
  const deleteFetcher = useFetcher<ActionData>();

  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [nav, setNav] = useState("");

  const isCreating =
    createFetcher.state !== "idle" &&
    createFetcher.formData?.get("intent") === "create";

  // Reset the form once a successful create has been ack'd by the action.
  useEffect(() => {
    if (createFetcher.state === "idle" && createFetcher.data?.ok) {
      setName("");
      setShort("");
      setNav("");
    }
  }, [createFetcher.state, createFetcher.data]);

  const createError =
    createFetcher.state === "idle" && createFetcher.data && !createFetcher.data.ok
      ? createFetcher.data.error
      : null;

  const deleteError =
    deleteFetcher.state === "idle" && deleteFetcher.data && !deleteFetcher.data.ok
      ? deleteFetcher.data.error
      : null;

  return (
    <Section title={ts.entities}>
      <div className="text-xs text-atlas-gray4 mb-4">{ts.entitiesDesc}</div>

      {/* Existing entities */}
      <div className="flex flex-col gap-2 mb-5">
        {entities.map((e) => {
          const fundCount = fundCountByEntity[e.id] ?? 0;
          const blocked = fundCount > 0;
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-atlas-surface border border-atlas-border"
            >
              <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light font-bold tracking-wider min-w-[44px] text-center">
                {e.short}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-atlas-white font-medium truncate">
                  {e.name}
                </div>
                <div className="text-[10px] text-atlas-gray4 font-mono">
                  {ts.entityFunds(fundCount)} &middot; {formatCurrency(e.nav)}
                </div>
              </div>
              <deleteFetcher.Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={e.id} />
                <button
                  type="submit"
                  disabled={blocked}
                  title={blocked ? ts.entityDeleteBlocked(fundCount) : ""}
                  className="px-2.5 py-1 rounded-md border border-atlas-border bg-transparent text-[11px] font-semibold text-atlas-gray3 hover:border-red-500/40 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-atlas-border disabled:hover:text-atlas-gray3"
                >
                  {ts.entityDelete}
                </button>
              </deleteFetcher.Form>
            </div>
          );
        })}
      </div>

      {deleteError && (
        <div className="text-[11px] text-red-400 mb-3" role="alert">
          {deleteError}
        </div>
      )}

      {/* Add entity form */}
      <createFetcher.Form
        method="post"
        className="flex flex-col gap-2 pt-4 border-t border-atlas-border"
      >
        <input type="hidden" name="intent" value="create" />
        <div className="text-[10px] font-semibold text-atlas-gray4 uppercase tracking-widest mb-1">
          {ts.addEntity}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_auto] gap-2">
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ts.entityName}
            maxLength={200}
            required
            className="bg-atlas-card border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors"
          />
          <input
            name="short"
            value={short}
            onChange={(e) => setShort(e.target.value.toUpperCase().slice(0, 6))}
            placeholder={ts.entityShort}
            pattern="[A-Z0-9]{2,6}"
            required
            className="bg-atlas-card border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors font-mono uppercase"
          />
          <input
            name="nav"
            value={nav}
            onChange={(e) => setNav(e.target.value)}
            placeholder={ts.entityNav}
            type="number"
            min="0"
            step="any"
            required
            className="bg-atlas-card border border-atlas-border rounded-md px-3 py-2 text-[12px] text-atlas-white outline-none placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 rounded-md bg-atlas-purple border-none text-atlas-white text-[12px] font-semibold cursor-pointer disabled:opacity-50"
          >
            {isCreating ? "…" : ts.entityCreate}
          </button>
        </div>
        {createError && (
          <div className="text-[11px] text-red-400" role="alert">
            {createError}
          </div>
        )}
      </createFetcher.Form>
    </Section>
  );
}

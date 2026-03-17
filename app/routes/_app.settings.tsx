import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "~/lib/theme-context";
import { useLang } from "~/lib/lang-context";
import { useAuth } from "~/lib/auth-context";
import { useT } from "~/lib/use-t";

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000`;
}

export default function SettingsPage() {
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

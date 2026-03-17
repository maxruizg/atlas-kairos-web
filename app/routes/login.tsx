import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { getSessionFromRequest } from "~/lib/auth-context";
import { getLangFromRequest } from "~/lib/lang-context";
import { getTranslations } from "~/lib/i18n";

export async function loader({ request }: { request: Request }) {
  const session = getSessionFromRequest(request);
  if (session) throw redirect("/");
  const lang = getLangFromRequest(request);
  return { lang };
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  const errors: Record<string, string> = {};
  if (!email) errors.email = "Required";
  if (!password) errors.password = "Required";
  if (Object.keys(errors).length > 0) return { errors };

  return redirect("/", {
    headers: {
      "Set-Cookie": "atlas-session=demo;path=/;max-age=31536000",
    },
  });
}

export default function LoginPage() {
  const { lang } = useLoaderData<{ lang: "en" | "es" }>();
  const actionData = useActionData<{ errors?: Record<string, string> }>();
  const t = getTranslations(lang);

  return (
    <div className="min-h-screen bg-atlas-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" className="text-atlas-purple mb-3">
            <path d="M16 2L28 16L16 30L4 16L16 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M16 8L22 16L16 24L10 16L16 8Z" fill="currentColor" />
          </svg>
          <span className="text-lg font-extrabold text-atlas-purple font-display tracking-wide">ATLAS</span>
          <h1 className="text-xl font-bold text-atlas-white mt-4 font-display">{t.auth.welcomeBack}</h1>
          <p className="text-sm text-atlas-gray3 mt-1">{t.auth.welcomeSubtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-atlas-card border border-atlas-border rounded-xl p-6">
          <Form method="post" className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">{t.auth.email}</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
                placeholder="you@example.com"
              />
              {actionData?.errors?.email && (
                <p className="text-xs text-red-400 mt-1">{actionData.errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">{t.auth.password}</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
                placeholder="••••••••"
              />
              {actionData?.errors?.password && (
                <p className="text-xs text-red-400 mt-1">{actionData.errors.password}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-atlas-purple text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
            >
              {t.auth.signIn}
            </button>
          </Form>
        </div>

        <p className="text-center text-sm text-atlas-gray3 mt-5">
          {t.auth.noAccount}{" "}
          <Link to="/signup" className="text-atlas-purple font-semibold no-underline hover:underline">
            {t.auth.signUpLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

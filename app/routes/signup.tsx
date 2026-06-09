import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { rawSignup } from "~/lib/api.server";
import { getSessionFromRequest } from "~/lib/auth-context";
import { getLangFromRequest } from "~/lib/lang-context";
import { getTranslations } from "~/lib/i18n";
import { PasswordInput } from "~/components/ui/PasswordInput";

export async function loader({ request }: { request: Request }) {
  const session = getSessionFromRequest(request);
  if (session) throw redirect("/");
  const lang = getLangFromRequest(request);
  return { lang };
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const organization = String(form.get("organization") || "").trim();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  // Front-side validation — the backend re-checks all of this.
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Required";
  if (!organization) errors.organization = "Required";
  if (!email) errors.email = "Required";
  if (!password) errors.password = "Required";
  if (password.length < 8)
    errors.password = "Use at least 8 characters";
  if (password !== confirmPassword)
    errors.confirmPassword = "Passwords do not match";
  if (Object.keys(errors).length > 0) return { errors };

  // Hit the real backend signup endpoint and forward the session cookie
  // it sets back to the browser.
  const res = await rawSignup({
    name,
    email,
    password,
    confirm_password: confirmPassword,
    organization_name: organization,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Signup failed";
    // Surface conflict on email field, everything else as a global message.
    if (res.status === 409) return { errors: { email: message } };
    return { errors: { _global: message } };
  }

  // Forward the backend's Set-Cookie verbatim. It already has the right
  // attributes (HttpOnly, SameSite=Lax, Path=/, Max-Age=1y) and — crucially —
  // its VALUE is the user's id, which `/auth/me` looks up.
  //
  // We previously also appended a second `atlas-session=ok` marker cookie
  // here. That was a bug: same name + same path means the second cookie
  // OVERRIDES the first (RFC 6265), so the browser ended up sending
  // `atlas-session=ok` back to the backend, which 401'd because no user
  // has id "ok", which bounced the user to /login on every page load.
  const setCookie = res.headers.get("set-cookie");
  const headers = new Headers();
  if (setCookie) headers.append("Set-Cookie", setCookie);

  return redirect("/onboarding", { headers });
}

export default function SignupPage() {
  const { lang } = useLoaderData<{ lang: "en" | "es" }>();
  const actionData = useActionData<{ errors?: Record<string, string> }>();
  const t = getTranslations(lang);

  return (
    <div className="min-h-screen bg-atlas-bg flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <svg
            width="36"
            height="36"
            viewBox="0 0 32 32"
            fill="none"
            className="text-atlas-purple mb-3"
          >
            <path
              d="M16 2L28 16L16 30L4 16L16 2Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path d="M16 8L22 16L16 24L10 16L16 8Z" fill="currentColor" />
          </svg>
          <span className="text-lg font-extrabold text-atlas-purple font-display tracking-wide">
            ATLAS
          </span>
          <h1 className="text-xl font-bold text-atlas-white mt-4 font-display">
            {t.auth.createAccount}
          </h1>
          <p className="text-sm text-atlas-gray3 mt-1">
            {t.auth.createSubtitle}
          </p>
        </div>

        <div className="bg-atlas-card border border-atlas-border rounded-xl p-6">
          <Form method="post" className="flex flex-col gap-4">
            {/* Owner name */}
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {t.auth.name}
              </label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
                placeholder="Carlos González"
                required
              />
              {actionData?.errors?.name && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.name}
                </p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {t.auth.organization}
              </label>
              <input
                type="text"
                name="organization"
                autoComplete="organization"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
                placeholder={t.auth.organizationPlaceholder}
                required
              />
              {actionData?.errors?.organization && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.organization}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {t.auth.email}
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
                placeholder="you@example.com"
                required
              />
              {actionData?.errors?.email && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {t.auth.password}
              </label>
              <PasswordInput
                name="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              {actionData?.errors?.password && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.password}
                </p>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {t.auth.confirmPassword}
              </label>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              {actionData?.errors?.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.confirmPassword}
                </p>
              )}
            </div>

            {actionData?.errors?._global && (
              <div className="text-xs text-red-400" role="alert">
                {actionData.errors._global}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-atlas-purple text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity"
            >
              {t.auth.signUp}
            </button>
          </Form>
        </div>

        <p className="text-center text-sm text-atlas-gray3 mt-5">
          {t.auth.hasAccount}{" "}
          <Link
            to="/login"
            className="text-atlas-purple font-semibold no-underline hover:underline"
          >
            {t.auth.signInLink}
          </Link>
        </p>
      </div>
    </div>
  );
}

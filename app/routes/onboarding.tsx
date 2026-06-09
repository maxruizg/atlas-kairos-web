import { useState } from "react";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { api } from "~/lib/api.server";
import { getSessionFromRequest } from "~/lib/auth-context";
import { getLangFromRequest } from "~/lib/lang-context";
import { getTranslations } from "~/lib/i18n";
import type { Organization } from "~/lib/types";

interface LoaderData {
  organization: Organization;
  lang: "en" | "es";
}

export async function loader({
  request,
}: {
  request: Request;
}): Promise<LoaderData | Response> {
  const session = getSessionFromRequest(request);
  if (!session) throw redirect("/login");

  const cookie = request.headers.get("cookie") || undefined;
  const organization = await api.getOrganization(cookie);
  if (organization.onboarded) throw redirect("/");

  const lang = getLangFromRequest(request);
  return { organization, lang };
}

interface ActionData {
  errors?: Record<string, string>;
}

export async function action({
  request,
}: {
  request: Request;
}): Promise<ActionData | Response> {
  const form = await request.formData();
  const orgName = String(form.get("organization") || "").trim();

  const errors: Record<string, string> = {};
  if (!orgName) errors.organization = "Required";
  if (Object.keys(errors).length > 0) return { errors };

  const cookie = request.headers.get("cookie") || undefined;

  // 1. Persist the family/company name.
  const orgResult = await api.updateOrganization({ name: orgName }, cookie);
  if (!orgResult.ok) return { errors: { organization: orgResult.error } };

  // 2. Mark the tenant as onboarded — this opens up the rest of the app.
  //    KYC for legal entities is collected separately from Settings →
  //    Add Entity (it belongs to each entity, not to the organization).
  const completeResult = await api.updateOrganization({ onboarded: true }, cookie);
  if (!completeResult.ok)
    return { errors: { organization: completeResult.error } };

  throw redirect("/");
}

export default function OnboardingPage() {
  const { organization, lang } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const t = getTranslations(lang);
  const ob = t.onboarding;
  const submitting = navigation.state !== "idle";

  const [orgName, setOrgName] = useState(organization.name);

  return (
    <div className="min-h-screen bg-atlas-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + intro */}
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
            {ob.title}
          </h1>
          <p className="text-sm text-atlas-gray3 mt-1 text-center">
            {ob.subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="bg-atlas-card border border-atlas-border rounded-xl p-6">
          <Form method="post" className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-atlas-gray3 mb-1.5">
                {ob.organization}
              </label>
              <input
                type="text"
                name="organization"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                maxLength={200}
                required
                placeholder={t.auth.organizationPlaceholder}
                className="w-full px-3 py-2 rounded-lg bg-atlas-surface border border-atlas-border text-sm text-atlas-white placeholder:text-atlas-gray4 focus:outline-none focus:border-atlas-purple"
              />
              {actionData?.errors?.organization && (
                <p className="text-xs text-red-400 mt-1">
                  {actionData.errors.organization}
                </p>
              )}
            </div>

            {/* Next-step preview */}
            <div className="bg-atlas-surface border border-atlas-border rounded-lg p-3.5 mt-1">
              <div className="text-[10px] font-bold text-atlas-purple uppercase tracking-widest mb-1.5">
                {ob.nextStepLabel}
              </div>
              <div className="text-[12px] text-atlas-gray2 leading-relaxed">
                {ob.nextStepBody}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !orgName.trim()}
              className="w-full py-2.5 rounded-lg bg-atlas-purple text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? "…" : ob.complete}
            </button>
          </Form>
        </div>

        <p className="text-center text-xs text-atlas-gray4 mt-5">
          {ob.footer}
        </p>
      </div>
    </div>
  );
}

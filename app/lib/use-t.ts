import { useLang } from "~/lib/lang-context";
import { getTranslations } from "~/lib/i18n";

export function useT() {
  const { lang } = useLang();
  return getTranslations(lang);
}

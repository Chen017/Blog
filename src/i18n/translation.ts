import { en } from "./languages/en";
import type I18nKey from "./i18nKey";

export type Translation = { [K in I18nKey]: string };

// The interface intentionally has one language; keep labels centralized.
export function i18n(key: I18nKey): string {
    return en[key];
}

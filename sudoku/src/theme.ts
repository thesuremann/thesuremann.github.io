import { requireElement } from './lib/dom.js';
import { isLanguage, translate, type Language } from './lib/i18n.js';
import {
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  readPreferenceValue,
  storePreferenceValue
} from './lib/preferences.js';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const themeSelectEl = requireElement('theme', HTMLSelectElement);
const themeLabelEl = requireElement('themeLabel', HTMLLabelElement);
const langSelectEl = requireElement('lang', HTMLSelectElement);

let themePreference = readStoredThemePreference();

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredThemePreference(): ThemePreference {
  const savedPreference = readPreferenceValue(THEME_STORAGE_KEY);
  return isThemePreference(savedPreference) ? savedPreference : 'system';
}

function storeThemePreference(preference: ThemePreference): void {
  storePreferenceValue(THEME_STORAGE_KEY, preference);
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemThemeQuery.matches ? 'dark' : 'light';
}

function applyTheme(preference: ThemePreference): void {
  document.documentElement.dataset.theme = resolveTheme(preference);

  if (themeSelectEl.value !== preference) {
    themeSelectEl.value = preference;
  }
}

function getInitialLanguage(): Language {
  const savedLang = readPreferenceValue(LANGUAGE_STORAGE_KEY);
  if (savedLang !== null && isLanguage(savedLang)) {
    return savedLang;
  }

  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

function updateThemeLabels(lang = langSelectEl.value): void {
  const resolvedLang: Language = isLanguage(lang) ? lang : 'ja';
  themeLabelEl.textContent = translate(resolvedLang, 'themeLabel');

  const labels: Record<ThemePreference, string> = {
    system: translate(resolvedLang, 'themeSystem'),
    light: translate(resolvedLang, 'themeLight'),
    dark: translate(resolvedLang, 'themeDark')
  };

  for (const option of themeSelectEl.options) {
    option.textContent = isThemePreference(option.value) ? labels[option.value] : option.value;
  }
}

function handleSystemThemeChange(): void {
  if (themePreference === 'system') {
    applyTheme(themePreference);
  }
}

themeSelectEl.addEventListener('change', () => {
  const nextPreference = isThemePreference(themeSelectEl.value)
    ? themeSelectEl.value
    : 'system';

  themePreference = nextPreference;
  storeThemePreference(themePreference);
  applyTheme(themePreference);
});

langSelectEl.addEventListener('change', () => updateThemeLabels());

if (typeof systemThemeQuery.addEventListener === 'function') {
  systemThemeQuery.addEventListener('change', handleSystemThemeChange);
} else if (typeof systemThemeQuery.addListener === 'function') {
  systemThemeQuery.addListener(handleSystemThemeChange);
}

applyTheme(themePreference);
updateThemeLabels(getInitialLanguage());

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { resources } from './resources';

type SupportedLocale = keyof typeof resources;

const fallbackLng: SupportedLocale = 'nb_NO';

const normalizeLocale = (tag?: string): SupportedLocale => {
  if (!tag) {
    return fallbackLng;
  }

  const normalized = tag.replace('-', '_');
  if (normalized in resources) {
    return normalized as SupportedLocale;
  }

  const languageCode = normalized.split('_')[0];
  const match = Object.keys(resources).find((locale) => locale.startsWith(languageCode));
  return (match as SupportedLocale) ?? fallbackLng;
};

if (!i18n.isInitialized) {
  const systemLocale = Localization.getLocales()[0]?.languageTag;
  const initialLocale = normalizeLocale(systemLocale);

  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: initialLocale,
    fallbackLng,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
  });
}

export default i18n;

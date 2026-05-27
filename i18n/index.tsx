import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { Locale, TranslationKey, translations } from '@/i18n/translations';

export type { TranslationKey };

type I18nContextValue = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const DEFAULT_LOCALE: Locale = 'en';

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: (key) => translations[DEFAULT_LOCALE][key],
});

function getDeviceLocale(): Locale {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];

  return locale in translations ? (locale as Locale) : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: PropsWithChildren) {
  const locale = getDeviceLocale();

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key) => translations[locale][key] ?? translations[DEFAULT_LOCALE][key],
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}

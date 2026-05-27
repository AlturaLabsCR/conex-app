export const translations = {
  en: {
    'tabs.sites': 'Sites',
    'tabs.editor': 'Editor',
    'tabs.account': 'Account',
    'screens.sites.heading': 'Sites',
    'screens.account.heading': 'Account',
  },
  es: {
    'tabs.sites': 'Páginas',
    'tabs.editor': 'Editor',
    'tabs.account': 'Cuenta',
    'screens.sites.heading': 'Páginas',
    'screens.account.heading': 'Cuenta',
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

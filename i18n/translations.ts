export const translations = {
  en: {
    'tabs.sites': 'Sites',
    'tabs.editor': 'Editor',
    'tabs.account': 'Account',
    'screens.sites.heading': 'Sites',
    'screens.account.heading': 'Account',
    'account.loginHeading': 'Login',
    'account.emailPlaceholder': 'Email',
    'account.codePlaceholder': 'Code',
    'account.codeSentNoticeTitle': 'Note',
    'account.codeSent': 'We sent a code to your email address. Enter it here to continue.',
    'account.login': 'Login',
    'account.logout': 'Logout',
    'account.verify': 'Verify',
  },
  es: {
    'tabs.sites': 'Páginas',
    'tabs.editor': 'Editor',
    'tabs.account': 'Cuenta',
    'screens.sites.heading': 'Páginas',
    'screens.account.heading': 'Cuenta',
    'account.loginHeading': 'Inicio de Sesión',
    'account.emailPlaceholder': 'Correo electrónico',
    'account.codePlaceholder': 'Código',
    'account.codeSentNoticeTitle': 'Nota',
    'account.codeSent':
      'Enviamos un código a tu correo electrónico. Ingrésalo aquí para continuar.',
    'account.login': 'Iniciar sesión',
    'account.logout': 'Cerrar sesión',
    'account.verify': 'Verificar',
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { BodyNotice } from '@/components/body-notice';
import ThemedScrollView from '@/components/themed-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TranslationKey, useTranslation } from '@/i18n';

type BillingPeriod = {
  unit: 'day' | 'week' | 'month' | 'year';
  count: number;
};

type Money = {
  amount: number;
  currency: string;
};

type AccountSubscriptionResponse = {
  status: 'active' | 'past_due' | 'canceled';
  dueDate: string | null;
  plan: {
    id: string;
    name: string;
    price: Money;
    billingPeriod: BillingPeriod;
    supportsRenewal: boolean;
  };
};

const ACCOUNT_SUBSCRIPTION: AccountSubscriptionResponse = {
  status: 'active',
  dueDate: '2026-06-27',
  plan: {
    id: 'pro',
    name: 'Pro Tier',
    price: {
      amount: 20,
      currency: 'USD',
    },
    billingPeriod: {
      unit: 'month',
      count: 1,
    },
    supportsRenewal: true,
  },
};

export default function AccountScreen() {
  const { email, isLoading, login, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const { locale, t } = useTranslation();
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const themeColors = Colors[colorScheme];
  const isLoggedIn = Boolean(email);
  const renewalUntil = ACCOUNT_SUBSCRIPTION.plan.supportsRenewal
    ? formatRenewalUntilDate(
        ACCOUNT_SUBSCRIPTION.dueDate,
        ACCOUNT_SUBSCRIPTION.plan.billingPeriod,
        locale
      )
    : null;
  const dueDate = ACCOUNT_SUBSCRIPTION.dueDate
    ? formatDate(ACCOUNT_SUBSCRIPTION.dueDate, locale)
    : t('account.noDueDate');
  const planPrice = formatRecurringPrice(
    ACCOUNT_SUBSCRIPTION.plan.price,
    ACCOUNT_SUBSCRIPTION.plan.billingPeriod,
    locale,
    t
  );

  function handleLogin() {
    if (!emailInput) {
      return;
    }

    setIsCodeStep(true);
  }

  async function handleVerify() {
    if (!codeInput) {
      return;
    }

    await login(emailInput);
    setIsChangingEmail(false);
    setIsCodeStep(false);
    setCodeInput('');
  }

  function handleChangeEmail() {
    setEmailInput(email);
    setCodeInput('');
    setIsCodeStep(false);
    setIsChangingEmail(true);
  }

  async function handleLogout() {
    await logout();
    setEmailInput('');
    setCodeInput('');
    setIsCodeStep(false);
    setIsChangingEmail(false);
  }

  return (
    <ThemedScrollView>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.account.heading')}</ThemedText>
        </ThemedView>

        {isLoading ? (
          <ActivityIndicator color={themeColors.control} />
        ) : isLoggedIn && !isChangingEmail ? (
          <ThemedView style={styles.content}>
            <ThemedView style={[styles.planCard, { borderColor: themeColors.border }]}>
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planName}>{t('account.userTitle')}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.planMeta}>
                <ThemedText style={[styles.accountEmail, { color: themeColors.secondaryControl }]}>
                  {email}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.planActions}>
                <AccountButton label={t('account.changeEmail')} onPress={handleChangeEmail} />
                <AccountButton
                  label={t('account.logout')}
                  onPress={handleLogout}
                  tone="secondary"
                />
              </ThemedView>
            </ThemedView>
            <ThemedView style={[styles.planCard, { borderColor: themeColors.border }]}>
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planName}>{ACCOUNT_SUBSCRIPTION.plan.name}</ThemedText>
                <ThemedText style={styles.planPrice}>
                  {planPrice}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.planMeta}>
                <ThemedText style={{ color: themeColors.secondaryControl }}>
                  {t('account.planDueDateLabel')} {dueDate}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.planActions}>
                {ACCOUNT_SUBSCRIPTION.plan.supportsRenewal ? (
                  <AccountButton
                    label={
                      renewalUntil
                        ? t('account.renewUntil').replace('{{date}}', renewalUntil)
                        : t('account.renew')
                    }
                    onPress={() => {}}
                  />
                ) : null}
                <AccountButton
                  label={t('account.switchPlan')}
                  onPress={() => {}}
                  tone="secondary"
                />
              </ThemedView>
            </ThemedView>
            <ThemedView style={[styles.planCard, { borderColor: themeColors.border }]}>
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planName}>{t('account.dangerZone')}</ThemedText>
              </ThemedView>
              <BodyNotice
                message={t('account.deleteAccountWarning')}
                title={t('account.warning')}
                variant="warning"
              />
              <ThemedView style={styles.planActions}>
                <AccountButton
                  label={t('account.deleteAccount')}
                  onPress={() => {}}
                  tone="destructive"
                />
              </ThemedView>
            </ThemedView>
          </ThemedView>
        ) : (
          <ThemedView style={[styles.content, styles.loginFlow]}>
            <ThemedText type="title" style={styles.loginHeading}>
              {isChangingEmail ? t('account.changeEmail') : t('account.loginHeading')}
            </ThemedText>
            {isCodeStep ? (
              <>
                <BodyNotice
                  message={t('account.codeSent')}
                  title={t('account.codeSentNoticeTitle')}
                  variant="note"
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="numeric"
                  onChangeText={setCodeInput}
                  placeholder={t('account.codePlaceholder')}
                  placeholderTextColor={themeColors.icon}
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    },
                  ]}
                  value={codeInput}
                />
                <AccountButton
                  disabled={!codeInput}
                  label={t('account.verify')}
                  onPress={handleVerify}
                />
              </>
            ) : (
              <>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode="email"
                  onChangeText={setEmailInput}
                  placeholder={t('account.emailPlaceholder')}
                  placeholderTextColor={themeColors.icon}
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text,
                    },
                  ]}
                  value={emailInput}
                />
                <AccountButton
                  disabled={!emailInput}
                  label={t('account.login')}
                  onPress={handleLogin}
                />
              </>
            )}
          </ThemedView>
        )}
      </ThemedView>
    </ThemedScrollView>
  );
}

function formatRenewalUntilDate(dueDate: string | null, billingPeriod: BillingPeriod, locale: string) {
  const renewalUntilDate = dueDate ? dateFromISODate(dueDate) : new Date();

  addBillingPeriod(renewalUntilDate, billingPeriod);

  return formatDate(renewalUntilDate, locale);
}

function addBillingPeriod(date: Date, billingPeriod: BillingPeriod) {
  if (billingPeriod.unit === 'day') {
    date.setDate(date.getDate() + billingPeriod.count);
  } else if (billingPeriod.unit === 'week') {
    date.setDate(date.getDate() + billingPeriod.count * 7);
  } else if (billingPeriod.unit === 'month') {
    date.setMonth(date.getMonth() + billingPeriod.count);
  } else {
    date.setFullYear(date.getFullYear() + billingPeriod.count);
  }
}

function formatMoney(price: Money, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amount);
}

function formatRecurringPrice(
  price: Money,
  billingPeriod: BillingPeriod,
  locale: string,
  t: (key: TranslationKey) => string
) {
  const amount = formatMoney(price, locale);

  if (billingPeriod.count === 1) {
    return `${amount}/${periodShortName(billingPeriod.unit, t)}`;
  }

  return `${amount} / ${billingPeriod.count} ${periodLongName(
    billingPeriod.unit,
    billingPeriod.count,
    t
  )}`;
}

function periodShortName(unit: BillingPeriod['unit'], t: (key: TranslationKey) => string) {
  return t(`billing.periodShort.${unit}`);
}

function periodLongName(
  unit: BillingPeriod['unit'],
  count: number,
  t: (key: TranslationKey) => string
) {
  const plurality = count === 1 ? 'one' : 'other';

  return t(`billing.periodLong.${unit}.${plurality}`);
}

function formatDate(date: string | Date, locale: string) {
  const value = typeof date === 'string' ? dateFromISODate(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}

function dateFromISODate(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function AccountButton({
  disabled,
  label,
  onPress,
  tone = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  tone?: 'primary' | 'secondary' | 'destructive';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const isPrimary = tone === 'primary';
  const isDestructive = tone === 'destructive';
  const buttonColor = isPrimary
    ? themeColors.control
    : isDestructive
      ? themeColors.destructive
      : themeColors.secondaryControl;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? buttonColor : 'transparent',
          borderColor: buttonColor,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      <ThemedText
        type="defaultSemiBold"
        style={[
          styles.buttonText,
          { color: isPrimary ? themeColors.controlText : buttonColor },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  loginFlow: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 360,
    width: '100%',
  },
  loginHeading: {
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  planCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planPrice: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  planName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  accountEmail: {
    width: '100%',
  },
  planMeta: {
    alignItems: 'flex-start',
  },
  planActions: {
    gap: 12,
  },
  button: {
    minHeight: 44,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonText: {
    textAlign: 'center',
  },
});

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
import { useTranslation } from '@/i18n';

const ACCOUNT_PLAN = {
  name: 'Pro Tier',
  price: '$20',
  dueDate: '2026-06-27',
  renewable: true,
  renewalPeriodDays: 30,
};

export default function AccountScreen() {
  const { email, isLoading, login, logout } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const { locale, t } = useTranslation();
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const themeColors = Colors[colorScheme];
  const isLoggedIn = Boolean(email);
  const renewalUntil = ACCOUNT_PLAN.renewable
    ? formatRenewalUntilDate(ACCOUNT_PLAN.dueDate, ACCOUNT_PLAN.renewalPeriodDays, locale)
    : null;
  const dueDate = ACCOUNT_PLAN.dueDate
    ? formatDate(ACCOUNT_PLAN.dueDate, locale)
    : t('account.noDueDate');

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
    setIsCodeStep(false);
    setCodeInput('');
  }

  async function handleLogout() {
    await logout();
    setEmailInput('');
    setCodeInput('');
    setIsCodeStep(false);
  }

  return (
    <ThemedScrollView>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">{t('screens.account.heading')}</ThemedText>
        </ThemedView>

        {isLoading ? (
          <ActivityIndicator color={themeColors.control} />
        ) : isLoggedIn ? (
          <ThemedView style={styles.content}>
            <ThemedText>{email}</ThemedText>
            <ThemedView style={[styles.planCard, { borderColor: themeColors.border }]}>
              <ThemedView style={styles.planHeader}>
                <ThemedText style={styles.planName}>{ACCOUNT_PLAN.name}</ThemedText>
                <ThemedText style={styles.planPrice}>
                  {ACCOUNT_PLAN.price}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.planMeta}>
                <ThemedText style={{ color: themeColors.secondaryControl }}>
                  {t('account.planDueDateLabel')} {dueDate}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.planActions}>
                {ACCOUNT_PLAN.renewable ? (
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
            <AccountButton label={t('account.logout')} onPress={handleLogout} tone="secondary" />
          </ThemedView>
        ) : (
          <ThemedView style={[styles.content, styles.loginFlow]}>
            <ThemedText type="title" style={styles.loginHeading}>
              {t('account.loginHeading')}
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

function formatRenewalUntilDate(dueDate: string | null, renewalPeriodDays: number, locale: string) {
  const renewalUntilDate = dueDate ? dateFromISODate(dueDate) : new Date();

  renewalUntilDate.setDate(renewalUntilDate.getDate() + renewalPeriodDays);

  return formatDate(renewalUntilDate, locale);
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
  tone?: 'primary' | 'secondary';
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const isPrimary = tone === 'primary';
  const buttonColor = isPrimary ? themeColors.control : themeColors.secondaryControl;

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

import { useRef, useState, type RefObject } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import {
  capturePlanOrder,
  createPlanOrder,
  listPlans,
  type AccountResponse,
  type PlanResponse,
} from '@/api/conex-api';
import { useAuth } from '@/auth/auth-context';
import { BodyNotice } from '@/components/body-notice';
import { ExternalLink } from '@/components/external-link';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import ThemedScrollView from '@/components/themed-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TranslationKey, useTranslation } from '@/i18n';

type BillingPeriod = {
  unit: string;
  count: number;
};

type Money = {
  amount: number;
  currency: string;
};

type Plan = {
  id: string;
  name: string;
  price: Money;
  billingPeriod: BillingPeriod;
  supportsRenewal: boolean;
};

type AccountSubscriptionResponse = {
  status: string;
  dueDate: string | null;
  plan: Plan;
};

type PayPalWebViewMessage = {
  id: string;
  type: 'create-order' | 'capture-order';
  payload?: {
    orderID?: string;
  };
} | {
  type: 'log';
  payload?: {
    level?: string;
    message?: string;
  };
};

export default function AccountScreen() {
  const {
    account,
    clearError,
    confirmEmailChange,
    deleteAccount,
    email,
    error,
    isLoading,
    login,
    logout,
    refreshAccount,
    requestEmailChange,
    verifyLogin,
  } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const { locale, t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [arePlansVisible, setArePlansVisible] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<Plan | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const webViewRef = useRef<WebView>(null);

  const themeColors = Colors[colorScheme];
  const isLoggedIn = Boolean(email);
  const accountSubscription = account ? subscriptionFromApi(account.subscription) : null;
  const paidPlans = plans.filter((plan) => plan.id !== 'free');
  const renewalUntil =
    accountSubscription?.plan.supportsRenewal &&
    hasBillingPeriod(accountSubscription.plan.billingPeriod)
    ? formatRenewalUntilDate(
        accountSubscription.dueDate,
        accountSubscription.plan.billingPeriod,
        locale
      )
    : null;
  const dueDate = accountSubscription?.dueDate
    ? formatDate(accountSubscription.dueDate, locale)
    : t('account.noDueDate');
  const planPrice = accountSubscription
    ? formatRecurringPrice(accountSubscription.plan.price, accountSubscription.plan.billingPeriod, locale, t)
    : '';
  const paypalClientID = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ?? '';

  async function handleLogin() {
    if (!emailInput) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      if (isChangingEmail) {
        await requestEmailChange(emailInput);
      } else {
        await login(emailInput);
      }
      setIsCodeStep(true);
    } catch {
      // Error message is stored by AuthProvider.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!codeInput) {
      return;
    }

    setIsSubmitting(true);
    clearError();

    try {
      if (isChangingEmail) {
        await confirmEmailChange(codeInput);
      } else {
        await verifyLogin(emailInput, codeInput);
      }
      setIsChangingEmail(false);
      setIsCodeStep(false);
      setCodeInput('');
    } catch {
      // Error message is stored by AuthProvider.
    } finally {
      setIsSubmitting(false);
    }
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

  async function handleDeleteAccount() {
    setIsSubmitting(true);
    clearError();

    try {
      await deleteAccount();
      setEmailInput('');
      setCodeInput('');
      setIsCodeStep(false);
      setIsChangingEmail(false);
    } catch {
      // Error message is stored by AuthProvider.
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSwitchPlan() {
    clearError();
    setPaymentError('');

    if (arePlansVisible) {
      setArePlansVisible(false);
      return;
    }

    setArePlansVisible(true);

    if (plans.length > 0) {
      return;
    }

    setIsLoadingPlans(true);

    try {
      const nextPlans = await listPlans();
      setPlans(nextPlans.map(planFromApi));
    } catch (loadPlansError) {
      setPaymentError(errorMessage(loadPlansError));
    } finally {
      setIsLoadingPlans(false);
    }
  }

  function handleStartPayment(plan: Plan) {
    setPaymentError('');

    if (!paypalClientID) {
      setPaymentError(t('account.paypalMissingClientId'));
      return;
    }

    setPaymentPlan(plan);
  }

  async function handlePaymentMessage(event: WebViewMessageEvent) {
    let message: PayPalWebViewMessage;

    try {
      message = JSON.parse(event.nativeEvent.data) as PayPalWebViewMessage;
    } catch {
      return;
    }

    if (message.type === 'log') {
      console.log(`[PayPal WebView:${message.payload?.level ?? 'log'}] ${message.payload?.message ?? ''}`);
      return;
    }

    if (!paymentPlan) {
      respondToPayPalMessage(message.id, false, { message: t('account.paymentUnavailable') });
      return;
    }

    try {
      if (message.type === 'create-order') {
        const order = await createPlanOrder(paymentPlan.id);
        respondToPayPalMessage(message.id, true, { id: order.id });
      } else if (message.type === 'capture-order') {
        const orderID = message.payload?.orderID;

        if (!orderID) {
          throw new Error(t('account.paymentUnavailable'));
        }

        await capturePlanOrder(orderID);
        respondToPayPalMessage(message.id, true, {});
        setPaymentPlan(null);
        setArePlansVisible(false);
        await refreshAccount();
      }
    } catch (paymentRequestError) {
      const messageText = errorMessage(paymentRequestError);
      setPaymentError(messageText);
      respondToPayPalMessage(message.id, false, { message: messageText });
    }
  }

  function respondToPayPalMessage(id: string, ok: boolean, payload: Record<string, unknown>) {
    const script = `window.__paypalNativeResponse(${JSON.stringify(id)}, ${JSON.stringify(
      ok
    )}, ${JSON.stringify(payload)}); true;`;

    webViewRef.current?.injectJavaScript(script);
  }

  return (
    <ThemedScrollView
      contentContainerStyle={!isLoggedIn || isChangingEmail ? styles.loginScrollContent : undefined}
      keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.container}>
        {isLoggedIn && !isChangingEmail ? (
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">{t('screens.account.heading')}</ThemedText>
          </ThemedView>
        ) : null}

        {isLoading ? (
          <ThemedActivityIndicator />
        ) : isLoggedIn && !isChangingEmail ? (
          <ThemedView style={styles.content}>
            {error ? <BodyNotice message={error} variant="error" /> : null}
            <ThemedView
              style={[
                styles.planCard,
                { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
              ]}>
              <View style={styles.planHeader}>
                <ThemedText style={styles.planName}>{t('account.userTitle')}</ThemedText>
              </View>
              <View style={styles.planMeta}>
                <ThemedText style={[styles.accountEmail, { color: themeColors.secondaryControl }]}>
                  {email}
                </ThemedText>
              </View>
              <View style={styles.planActions}>
                <AccountButton
                  disabled={isSubmitting}
                  label={t('account.changeEmail')}
                  onPress={handleChangeEmail}
                />
                <AccountButton
                  disabled={isSubmitting}
                  label={t('account.logout')}
                  onPress={handleLogout}
                  tone="secondary"
                />
              </View>
            </ThemedView>
            <ThemedView
              style={[
                styles.planCard,
                { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
              ]}>
              <View style={styles.planHeader}>
                <ThemedText style={styles.planName}>{accountSubscription?.plan.name}</ThemedText>
                <ThemedText type="subtitle" style={styles.planPrice}>
                  {planPrice}
                </ThemedText>
              </View>
              <View style={styles.planMeta}>
                <ThemedText style={[styles.planMetaText, { color: themeColors.secondaryControl }]}>
                  {t('account.planDueDateLabel')} {dueDate}
                </ThemedText>
              </View>
              <View style={styles.planActions}>
                {accountSubscription?.plan.supportsRenewal ? (
                  <AccountButton
                    disabled={isSubmitting}
                    label={
                      renewalUntil
                        ? t('account.renewUntil').replace('{{date}}', renewalUntil)
                        : t('account.renew')
                    }
                    onPress={() => handleStartPayment(accountSubscription.plan)}
                  />
                ) : null}
                <AccountButton
                  disabled={isSubmitting || isLoadingPlans}
                  label={t('account.switchPlan')}
                  onPress={handleSwitchPlan}
                  tone="secondary"
                />
              </View>
              {paymentError ? <BodyNotice message={paymentError} variant="error" /> : null}
              {arePlansVisible ? (
                <View style={styles.availablePlans}>
                  {isLoadingPlans ? (
                    <ThemedActivityIndicator />
                  ) : paidPlans.length > 0 ? (
                    paidPlans.map((plan) => (
                      <PlanOption
                        currentPlanID={accountSubscription?.plan.id}
                        disabled={isSubmitting}
                        key={plan.id}
                        locale={locale}
                        onPress={() => handleStartPayment(plan)}
                        plan={plan}
                        t={t}
                      />
                    ))
                  ) : (
                    <ThemedText style={[styles.planMetaText, { color: themeColors.secondaryControl }]}>
                      {t('account.noPlansAvailable')}
                    </ThemedText>
                  )}
                </View>
              ) : null}
            </ThemedView>
            <ThemedView
              style={[
                styles.planCard,
                { backgroundColor: themeColors.cardBackground, borderColor: themeColors.border },
              ]}>
              <View style={styles.planHeader}>
                <ThemedText style={styles.planName}>{t('account.dangerZone')}</ThemedText>
              </View>
              <BodyNotice
                message={t('account.deleteAccountWarning')}
                title={t('account.warning')}
                variant="warning"
              />
              <View style={styles.planActions}>
                <AccountButton
                  disabled={isSubmitting}
                  label={t('account.deleteAccount')}
                  onPress={handleDeleteAccount}
                  tone="destructive"
                />
              </View>
            </ThemedView>
          </ThemedView>
        ) : (
          <ThemedView style={[styles.content, styles.loginFlow]}>
            <ThemedText type="title" style={styles.loginHeading}>
              {isChangingEmail ? t('account.changeEmail') : t('account.loginHeading')}
            </ThemedText>
            {!isCodeStep ? (
              <ThemedText style={[styles.loginNotice, { color: themeColors.secondaryControl }]}>
                {t('account.confirmationEmailNotice')}
              </ThemedText>
            ) : null}
            {error ? <BodyNotice message={error} variant="error" /> : null}
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
                  disabled={!codeInput || isSubmitting}
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
                  disabled={!emailInput || isSubmitting}
                  label={t('account.login')}
                  onPress={handleLogin}
                />
                <ThemedText style={[styles.legalText, { color: themeColors.secondaryControl }]}>
                  {t('account.legalPrefix')}
                  <ExternalLink href="https://conex.co.cr/tos" style={styles.legalLink}>
                    {t('account.legalTerms')}
                  </ExternalLink>
                  {t('account.legalMiddle')}
                  <ExternalLink href="https://conex.co.cr/privacy" style={styles.legalLink}>
                    {t('account.legalPrivacy')}
                  </ExternalLink>
                  {t('account.legalSuffix')}
                </ThemedText>
                <ThemedText style={[styles.copyrightText, { color: themeColors.secondaryControl }]}>
                  {t('account.copyright')}
                </ThemedText>
              </>
            )}
          </ThemedView>
        )}
      </ThemedView>
      {paymentPlan ? (
        <PayPalCheckoutModal
          clientID={paypalClientID}
          onClose={() => setPaymentPlan(null)}
          onMessage={handlePaymentMessage}
          plan={paymentPlan}
          refObject={webViewRef}
          themeColors={themeColors}
          title={t('account.payWithPayPal')}
        />
      ) : null}
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
  } else if (billingPeriod.unit === 'year') {
    date.setFullYear(date.getFullYear() + billingPeriod.count);
  }
}

function formatMoney(price: Money, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: price.currency,
  }).format(price.amount / 100);
}

function formatRecurringPrice(
  price: Money,
  billingPeriod: BillingPeriod,
  locale: string,
  t: (key: TranslationKey) => string
) {
  const amount = formatMoney(price, locale);

  if (!hasBillingPeriod(billingPeriod)) {
    return amount;
  }

  if (billingPeriod.count === 1) {
    return `${amount}/${periodShortName(billingPeriod.unit, t)}`;
  }

  return `${amount} / ${billingPeriod.count} ${periodLongName(
    billingPeriod.unit,
    billingPeriod.count,
    t
  )}`;
}

function periodShortName(unit: string, t: (key: TranslationKey) => string) {
  if (!isBillingPeriodUnit(unit)) {
    return unit;
  }

  return t(`billing.periodShort.${unit}`);
}

function periodLongName(unit: string, count: number, t: (key: TranslationKey) => string) {
  if (!isBillingPeriodUnit(unit)) {
    return unit;
  }

  const plurality = count === 1 ? 'one' : 'other';

  return t(`billing.periodLong.${unit}.${plurality}`);
}

function isBillingPeriodUnit(unit: string): unit is 'day' | 'week' | 'month' | 'year' {
  return unit === 'day' || unit === 'week' || unit === 'month' || unit === 'year';
}

function hasBillingPeriod(billingPeriod: BillingPeriod) {
  return billingPeriod.unit !== '' && billingPeriod.count !== 0;
}

function subscriptionFromApi(subscription: AccountResponse['subscription']): AccountSubscriptionResponse {
  return {
    status: subscription.status,
    dueDate: subscription.due_date || null,
    plan: planFromApi(subscription.plan),
  };
}

function planFromApi(plan: PlanResponse): Plan {
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    billingPeriod: plan.billing_period,
    supportsRenewal: plan.supports_renewal,
  };
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

function PlanOption({
  currentPlanID,
  disabled,
  locale,
  onPress,
  plan,
  t,
}: {
  currentPlanID?: string;
  disabled?: boolean;
  locale: string;
  onPress: () => void;
  plan: Plan;
  t: (key: TranslationKey) => string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const isCurrentPlan = currentPlanID === plan.id;

  return (
    <Pressable
      disabled={disabled || isCurrentPlan}
      onPress={onPress}
      style={({ pressed }) => [
        styles.planOption,
        {
          borderColor: themeColors.border,
          opacity: disabled || isCurrentPlan ? 0.6 : pressed ? 0.8 : 1,
        },
      ]}>
      <View style={styles.planOptionText}>
        <ThemedText type="defaultSemiBold">{plan.name}</ThemedText>
        <ThemedText style={[styles.planMetaText, { color: themeColors.secondaryControl }]}>
          {formatRecurringPrice(plan.price, plan.billingPeriod, locale, t)}
        </ThemedText>
      </View>
      <ThemedText style={[styles.planMetaText, { color: themeColors.secondaryControl }]}>
        {isCurrentPlan ? t('account.currentPlan') : t('account.selectPlan')}
      </ThemedText>
    </Pressable>
  );
}

function PayPalCheckoutModal({
  clientID,
  onClose,
  onMessage,
  plan,
  refObject,
  themeColors,
  title,
}: {
  clientID: string;
  onClose: () => void;
  onMessage: (event: WebViewMessageEvent) => void;
  plan: Plan;
  refObject: RefObject<WebView | null>;
  themeColors: typeof Colors.light;
  title: string;
}) {
  const html = paypalCheckoutHTML({
    clientID,
    currency: plan.price.currency,
    textColor: themeColors.text,
    backgroundColor: themeColors.background,
  });

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView style={[styles.paymentModal, { backgroundColor: themeColors.background }]}>
        <View style={[styles.paymentHeader, { borderBottomColor: themeColors.border }]}>
          <Pressable onPress={onClose} style={styles.paymentCloseButton}>
            <ThemedText type="defaultSemiBold">x</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.paymentTitle}>
            {title}
          </ThemedText>
          <View style={styles.paymentHeaderSpacer} />
        </View>
        <WebView
          domStorageEnabled
          javaScriptCanOpenWindowsAutomatically
          javaScriptEnabled
          onError={(event) => {
            console.warn('[PayPal WebView:error]', event.nativeEvent);
          }}
          onHttpError={(event) => {
            console.warn('[PayPal WebView:http-error]', event.nativeEvent);
          }}
          onMessage={onMessage}
          originWhitelist={['*']}
          ref={refObject}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ html }}
          style={styles.paymentWebView}
          thirdPartyCookiesEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

function paypalCheckoutHTML({
  backgroundColor,
  clientID,
  currency,
  textColor,
}: {
  backgroundColor: string;
  clientID: string;
  currency: string;
  textColor: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <script>
      function postNativeLog(level, message) {
        if (!window.ReactNativeWebView) {
          return;
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'log',
          payload: { level: level, message: String(message) }
        }));
      }

      ['log', 'warn', 'error'].forEach(function(level) {
        const original = console[level];

        console[level] = function() {
          const message = Array.prototype.slice.call(arguments).map(function(value) {
            if (value instanceof Error) {
              return value.message;
            }

            if (typeof value === 'object') {
              try {
                return JSON.stringify(value);
              } catch {
                return String(value);
              }
            }

            return String(value);
          }).join(' ');

          postNativeLog(level, message);
          original.apply(console, arguments);
        };
      });

      window.onerror = function(message, source, line, column) {
        postNativeLog('error', message + ' at ' + source + ':' + line + ':' + column);
      };

      window.onunhandledrejection = function(event) {
        postNativeLog('error', event.reason && event.reason.message ? event.reason.message : event.reason);
      };
    </script>
    <script src="https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientID
    )}&currency=${encodeURIComponent(currency)}"></script>
    <style>
      html, body {
        background: ${backgroundColor};
        color: ${textColor};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
        min-height: 100%;
      }
      #paypal-button-container {
        padding: 24px 16px;
      }
      #message {
        padding: 0 16px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div id="paypal-button-container"></div>
    <div id="message"></div>
    <script>
      const pending = {};

      function callNative(type, payload) {
        const id = String(Date.now()) + Math.random().toString(16).slice(2);

        window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, payload }));

        return new Promise((resolve, reject) => {
          pending[id] = { resolve, reject };
        });
      }

      window.__paypalNativeResponse = function(id, ok, payload) {
        const callback = pending[id];

        if (!callback) {
          return;
        }

        delete pending[id];

        if (ok) {
          callback.resolve(payload);
        } else {
          callback.reject(new Error(payload && payload.message ? payload.message : 'Payment failed.'));
        }
      };

      paypal.Buttons({
        createOrder: function() {
          console.log('createOrder requested');
          return callNative('create-order', {}).then(function(order) {
            console.log('createOrder received ' + order.id);
            return order.id;
          });
        },
        onApprove: function(data) {
          console.log('onApprove for order ' + data.orderID);
          return callNative('capture-order', { orderID: data.orderID });
        },
        onCancel: function() {
          console.log('payment cancelled');
          document.getElementById('message').textContent = '';
        },
        onError: function(error) {
          console.error(error && error.message ? error.message : error);
          document.getElementById('message').textContent = error.message || 'Payment failed.';
        }
      }).render('#paypal-button-container').then(function() {
        console.log('PayPal buttons rendered');
      }).catch(function(error) {
        console.error(error && error.message ? error.message : error);
      });
    </script>
  </body>
</html>`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
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
    minHeight: 520,
    width: '100%',
  },
  loginScrollContent: {
    flexGrow: 1,
  },
  loginHeading: {
    textAlign: 'center',
    paddingBottom: 12,
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
    flexShrink: 0,
  },
  planName: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  accountEmail: {
    width: '100%',
    fontSize: 13,
    lineHeight: 18,
  },
  planMetaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  planMeta: {
    alignItems: 'flex-start',
  },
  planActions: {
    gap: 12,
  },
  availablePlans: {
    gap: 10,
  },
  planOption: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planOptionText: {
    flex: 1,
    gap: 2,
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
  legalText: {
    maxWidth: 420,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  loginNotice: {
    maxWidth: 420,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  legalLink: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  copyrightText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  paymentModal: {
    flex: 1,
  },
  paymentHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  paymentCloseButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    flex: 1,
    textAlign: 'center',
  },
  paymentHeaderSpacer: {
    width: 54,
  },
  paymentWebView: {
    flex: 1,
  },
});

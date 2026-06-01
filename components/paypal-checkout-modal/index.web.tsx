import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';

import type { PayPalCheckoutModalProps } from './types';

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel: () => void;
        onError: (error: unknown) => void;
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

export function PayPalCheckoutModal({
  backgroundColor,
  clientID,
  currency,
  onCaptureOrder,
  onClose,
  onCreateOrder,
  onLog,
  textColor,
  themeColors,
  title,
}: PayPalCheckoutModalProps) {
  const containerID = useMemo(
    () => `paypal-button-container-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function renderPayPalButtons() {
      setIsLoading(true);
      setError('');

      try {
        await loadPayPalSdk(clientID, currency);

        if (!isMounted || !window.paypal) {
          return;
        }

        await window.paypal
          .Buttons({
            createOrder: async () => {
              onLog?.('log', 'createOrder requested');
              const orderID = await onCreateOrder();
              onLog?.('log', `createOrder received ${orderID}`);
              return orderID;
            },
            onApprove: async (data) => {
              onLog?.('log', `onApprove for order ${data.orderID}`);
              await onCaptureOrder(data.orderID);
            },
            onCancel: () => {
              onLog?.('log', 'payment cancelled');
            },
            onError: (payPalError) => {
              const message = errorMessage(payPalError);
              onLog?.('error', message);
              setError(message);
            },
          })
          .render(`#${containerID}`);

        onLog?.('log', 'PayPal buttons rendered');
      } catch (renderError) {
        const message = errorMessage(renderError);
        onLog?.('error', message);
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    renderPayPalButtons();

    return () => {
      isMounted = false;
    };
  }, [clientID, containerID, currency, onCaptureOrder, onCreateOrder, onLog]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaView style={[styles.paymentModal, { backgroundColor }]}>
        <View style={[styles.paymentHeader, { borderBottomColor: themeColors.border }]}>
          <Pressable onPress={onClose} style={styles.paymentCloseButton}>
            <ThemedText type="defaultSemiBold">x</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.paymentTitle}>
            {title}
          </ThemedText>
          <View style={styles.paymentHeaderSpacer} />
        </View>
        <View style={styles.paymentBody}>
          {isLoading ? <ThemedActivityIndicator /> : null}
          {error ? <ThemedText style={[styles.paymentError, { color: themeColors.destructive }]}>{error}</ThemedText> : null}
          {/*
            React Native Web does not expose a typed div component. PayPal needs a real DOM node.
          */}
          {createPayPalContainer(containerID, backgroundColor, textColor)}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createPayPalContainer(id: string, backgroundColor: string, textColor: string) {
  return (
    <div
      id={id}
      style={{
        backgroundColor,
        boxSizing: 'border-box',
        color: textColor,
        maxWidth: 420,
        minHeight: 160,
        padding: 16,
        width: '100%',
      }}
    />
  );
}

function loadPayPalSdk(clientID: string, currency: string) {
  const scriptID = `paypal-sdk-${clientID}-${currency}`;
  const existingScript = document.getElementById(scriptID);

  if (window.paypal) {
    return Promise.resolve();
  }

  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load PayPal.')), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');

    script.id = scriptID;
    script.src = paypalSdkURL(clientID, currency);
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load PayPal.')), {
      once: true,
    });

    document.body.appendChild(script);
  });
}

function paypalSdkURL(clientID: string, currency: string) {
  const params = new URLSearchParams({
    'client-id': clientID,
    commit: 'true',
    components: 'buttons',
    currency,
    'enable-funding': 'card',
    intent: 'capture',
  });

  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Payment failed.';
}

const styles = StyleSheet.create({
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
  paymentBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  paymentError: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: 'center',
  },
});

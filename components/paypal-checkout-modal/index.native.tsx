import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';

import type { PayPalCheckoutModalProps } from './types';

type PayPalWebViewMessage =
  | {
      id: string;
      type: 'create-order' | 'capture-order';
      payload?: {
        orderID?: string;
      };
    }
  | {
      type: 'log';
      payload?: {
        level?: string;
        message?: string;
      };
    };

export function PayPalCheckoutModal({
  backgroundColor,
  clientID,
  currency,
  merchantBaseURL,
  onCaptureOrder,
  onClose,
  onCreateOrder,
  onLog,
  textColor,
  themeColors,
  title,
}: PayPalCheckoutModalProps) {
  const html = paypalCheckoutHTML({ backgroundColor, clientID, currency, textColor });
  let webViewRef: WebView | null = null;

  async function handleMessage(event: WebViewMessageEvent) {
    let message: PayPalWebViewMessage;

    try {
      message = JSON.parse(event.nativeEvent.data) as PayPalWebViewMessage;
    } catch {
      return;
    }

    if (message.type === 'log') {
      onLog?.(message.payload?.level ?? 'log', message.payload?.message ?? '');
      return;
    }

    try {
      if (message.type === 'create-order') {
        const orderID = await onCreateOrder();
        respondToPayPalMessage(webViewRef, message.id, true, { id: orderID });
      } else if (message.type === 'capture-order') {
        const orderID = message.payload?.orderID;

        if (!orderID) {
          throw new Error('Missing PayPal order ID.');
        }

        await onCaptureOrder(orderID);
        respondToPayPalMessage(webViewRef, message.id, true, {});
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Payment failed.';
      respondToPayPalMessage(webViewRef, message.id, false, { message: messageText });
    }
  }

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
          onMessage={handleMessage}
          originWhitelist={['*']}
          ref={(ref) => {
            webViewRef = ref;
          }}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ html, baseUrl: merchantBaseURL }}
          style={styles.paymentWebView}
          thirdPartyCookiesEnabled
        />
      </SafeAreaView>
    </Modal>
  );
}

function respondToPayPalMessage(
  webViewRef: WebView | null,
  id: string,
  ok: boolean,
  payload: Record<string, unknown>
) {
  const script = `window.__paypalNativeResponse(${JSON.stringify(id)}, ${JSON.stringify(
    ok
  )}, ${JSON.stringify(payload)}); true;`;

  webViewRef?.injectJavaScript(script);
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
    <script src="${paypalSdkURL(clientID, currency)}"></script>
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
  paymentWebView: {
    flex: 1,
  },
});

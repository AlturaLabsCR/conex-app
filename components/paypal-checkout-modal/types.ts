import type { Colors } from '@/constants/theme';

export type PayPalCheckoutModalProps = {
  backgroundColor: string;
  clientID: string;
  currency: string;
  merchantBaseURL: string;
  onCaptureOrder: (orderID: string) => Promise<void>;
  onClose: () => void;
  onCreateOrder: () => Promise<string>;
  onLog?: (level: string, message: string) => void;
  textColor: string;
  themeColors: typeof Colors.light;
  title: string;
};

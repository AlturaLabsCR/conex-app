const DEFAULT_CONEX_API_BASE_URL = 'https://conex.co.cr';
const DEFAULT_PAYPAL_CLIENT_ID =
  'AbNbBZQrhDBixAqFiMxZmVk-936BXuC44yuRFtqNa-rknJLjK8XqTtohv06sSyRmBB_qvWfwQ9JB3GNA';

export const CONEX_API_BASE_URL = normalizeBaseURL(
  process.env.EXPO_PUBLIC_CONEX_API_BASE_URL || DEFAULT_CONEX_API_BASE_URL
);

export const PAYPAL_CLIENT_ID =
  process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID || DEFAULT_PAYPAL_CLIENT_ID;

function normalizeBaseURL(url: string) {
  return url.replace(/\/+$/, '');
}

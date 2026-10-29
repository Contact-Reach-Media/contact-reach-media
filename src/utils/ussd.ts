import type { PaymentMethod } from '../types.ts';

/**
 * ContactReach Market Official Mobile Money USSD Configuration (Rwanda)
 * 
 * 1. MTN MoMo Direct Transfer:   *182*1*1*0780022600*AMOUNT#  (Receiver: Ruth / 0780022600)
 * 2. MTN MoMoPay Merchant Code:  *182*8*1*2328354*AMOUNT#     (Merchant: 2328354 / ContactReach Market)
 * 3. Airtel Money Transfer:       *182*1*2*0780022600*AMOUNT#  (Receiver: Ruth / 0780022600)
 */

export const USSD_CONFIG = {
  mtnMomoNumber: '0780022600',
  mtnMerchantCode: '2328354',
  airtelNumber: '0780022600',
  receiverName: 'Ruth',
  merchantName: 'ContactReach Market'
};

/**
 * Builds the exact USSD string for Rwandan telecom operators
 */
export function buildUssdCode(
  method: PaymentMethod,
  amount: number,
  customReceiverPhone?: string,
  customMerchantCode?: string
): string {
  const roundedAmount = Math.max(0, Math.round(amount));
  const momoPhone = (customReceiverPhone || USSD_CONFIG.mtnMomoNumber).replace(/\s+/g, '');
  const merchantCode = (customMerchantCode || USSD_CONFIG.mtnMerchantCode).replace(/\s+/g, '');
  const airtelPhone = (customReceiverPhone || USSD_CONFIG.airtelNumber).replace(/\s+/g, '');

  switch (method) {
    case 'MTN Merchant Code':
      // MTN MoMoPay Merchant: *182*8*1*2328354*AMOUNT#
      return `*182*8*1*${merchantCode}*${roundedAmount}#`;

    case 'Airtel Money':
      // Airtel Money: *182*1*2*0780022600*AMOUNT#
      return `*182*1*2*${airtelPhone}*${roundedAmount}#`;

    case 'MTN Mobile Money':
    default:
      // MTN MoMo Direct Transfer: *182*1*1*0780022600*AMOUNT#
      return `*182*1*1*${momoPhone}*${roundedAmount}#`;
  }
}

/**
 * Converts a USSD code into a standard mobile dialer URI.
 * In web standards (RFC 3986), literal '#' is parsed as a URL fragment identifier.
 * Replacing '#' with '%23' guarantees the trailing hash is preserved and passed
 * directly to the native phone dialer on Android (Chrome, Samsung, Transsion) and iOS (Safari).
 */
export function formatUssdTelUri(ussdCode: string): string {
  const clean = ussdCode.trim();
  const encoded = clean.replace(/#/g, '%23');
  return `tel:${encoded}`;
}

/**
 * Automatically triggers the phone dialer with the USSD code on mobile devices.
 * Uses a temporary DOM anchor click with window.location fallback.
 */
export function autoTriggerUssd(ussdCode: string): boolean {
  if (typeof window === 'undefined') return false;
  const telUri = formatUssdTelUri(ussdCode);

  try {
    const a = document.createElement('a');
    a.href = telUri;
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-hidden', 'true');
    a.style.position = 'fixed';
    a.style.top = '-9999px';
    a.style.left = '-9999px';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
      } catch {}
    }, 1500);
    return true;
  } catch (err) {
    try {
      window.location.href = telUri;
      return true;
    } catch {
      return false;
    }
  }
}

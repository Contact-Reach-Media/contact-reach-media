export type CurrencyCode =
  | 'RWF'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'KES'
  | 'TZS'
  | 'UGX'
  | 'NGN'
  | 'ZAR'
  | 'CNY';

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  name: string;
  nativeName: string;
  flag: string;
  isBase?: boolean;
  prefix?: string;
  suffix?: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  {
    code: 'RWF',
    symbol: 'FRW',
    name: 'Rwandan Franc',
    nativeName: 'Faranga y\'u Rwanda',
    flag: '🇷🇼',
    isBase: true,
    suffix: ' frw',
    decimals: 0
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nativeName: 'US Dollar',
    flag: '🇺🇸',
    prefix: '$',
    decimals: 2
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nativeName: 'Euro',
    flag: '🇪🇺',
    prefix: '€',
    decimals: 2
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    nativeName: 'British Pound',
    flag: '🇬🇧',
    prefix: '£',
    decimals: 2
  },
  {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    nativeName: 'Shilingi ya Kenya',
    flag: '🇰🇪',
    prefix: 'KSh ',
    decimals: 0
  },
  {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    nativeName: 'Shilingi ya Tanzania',
    flag: '🇹🇿',
    prefix: 'TSh ',
    decimals: 0
  },
  {
    code: 'UGX',
    symbol: 'USh',
    name: 'Ugandan Shilling',
    nativeName: 'Shilling ya Uganda',
    flag: '🇺🇬',
    prefix: 'USh ',
    decimals: 0
  },
  {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    nativeName: 'Nigerian Naira',
    flag: '🇳🇬',
    prefix: '₦',
    decimals: 0
  },
  {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    nativeName: 'South African Rand',
    flag: '🇿🇦',
    prefix: 'R ',
    decimals: 2
  },
  {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    nativeName: '人民币',
    flag: '🇨🇳',
    prefix: '¥',
    decimals: 2
  }
];

// Fallback rates relative to 1 RWF (based on official market baselines)
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  RWF: 1,
  USD: 1 / 1478.24,
  EUR: 0.8939 / 1478.24,
  GBP: 0.7492 / 1478.24,
  KES: 129.91 / 1478.24,
  TZS: 2642.58 / 1478.24,
  UGX: 4229.34 / 1478.24,
  NGN: 1359.91 / 1478.24,
  ZAR: 16.635 / 1478.24,
  CNY: 6.6837 / 1478.24
};

export const DEFAULT_EXCHANGE_RATES = FALLBACK_RATES;

/**
 * Converts an amount in base Rwandan Francs (RWF) to the chosen target currency.
 */
export function convertCurrency(
  amountInRwf: number,
  currency: CurrencyCode,
  rates?: Record<string, number>
): number {
  if (currency === 'RWF' || !amountInRwf || isNaN(amountInRwf)) {
    return amountInRwf || 0;
  }
  const rate = (rates && rates[currency] && rates[currency] > 0)
    ? rates[currency]
    : (FALLBACK_RATES[currency] || 1);
  return amountInRwf * rate;
}

/**
 * Formats a base RWF price into the target currency display string with appropriate
 * symbols, decimals, and optional secondary base FRW notation.
 */
export function formatCurrencyPrice(
  amountInRwf: number,
  currency: CurrencyCode = 'RWF',
  rates?: Record<string, number>,
  options: { showBaseSecondary?: boolean; compact?: boolean } = {}
): {
  primary: string;
  secondary?: string;
  rawConverted: number;
} {
  const safeRwf = Math.max(0, Number(amountInRwf) || 0);
  const cfg = SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
  const converted = convertCurrency(safeRwf, currency, rates);

  let primary = '';
  if (currency === 'RWF') {
    primary = `${Math.round(safeRwf).toLocaleString()} frw`;
  } else {
    const formattedNum = cfg.decimals > 0
      ? converted.toLocaleString(undefined, {
          minimumFractionDigits: cfg.decimals,
          maximumFractionDigits: cfg.decimals
        })
      : Math.round(converted).toLocaleString();

    if (cfg.prefix) {
      primary = `${cfg.prefix}${formattedNum}`;
    } else if (cfg.suffix) {
      primary = `${formattedNum}${cfg.suffix}`;
    } else {
      primary = `${cfg.symbol} ${formattedNum}`;
    }
  }

  let secondary: string | undefined = undefined;
  if (options.showBaseSecondary && currency !== 'RWF') {
    secondary = `(~ ${Math.round(safeRwf).toLocaleString()} FRW)`;
  }

  return {
    primary,
    secondary,
    rawConverted: converted
  };
}

/**
 * Helper to get Currency metadata
 */
export function getCurrencyConfig(code: CurrencyCode): CurrencyOption {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}

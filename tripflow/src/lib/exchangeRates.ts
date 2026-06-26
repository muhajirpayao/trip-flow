// src/lib/exchangeRates.ts
// Live exchange rates via open.er-api.com (free, no key).
// Falls back to hardcoded June-2026 snapshot if fetch fails.

import type { Currency } from '../types';

// Rates: how many of this currency = 1 USD
const FALLBACK_PER_USD: Record<Currency, number> = {
  USD: 1,
  PHP: 56.98,
  EUR: 0.895,
  GBP: 0.773,
  JPY: 154.1,
  SGD: 1.323,
  AUD: 1.560,
  CAD: 1.364,
  HKD: 7.827,
};

let cache: { rates: Record<Currency, number>; ts: number } | null = null;
const TTL_MS = 30 * 60 * 1000; // 30 min

/** Returns rates as: how many [currency] = 1 USD */
export async function getRatesPerUSD(): Promise<Record<Currency, number>> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.rates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json() as { rates: Record<string, number> };
    const apiRates = json.rates;
    const currencies: Currency[] = ['USD','PHP','EUR','GBP','JPY','SGD','AUD','CAD','HKD'];
    const rates = {} as Record<Currency, number>;
    for (const c of currencies) {
      rates[c] = apiRates[c] ?? FALLBACK_PER_USD[c];
    }
    cache = { rates, ts: Date.now() };
    return rates;
  } catch {
    return FALLBACK_PER_USD;
  }
}

/**
 * Convert amount from one currency to another.
 * rates = { USD: 1, PHP: 56.98, HKD: 7.827, ... }  (per 1 USD)
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>,
): number {
  if (from === to || amount === 0) return amount;
  const amtInUSD = amount / rates[from];
  return amtInUSD * rates[to];
}

/** Format with thousand commas, no decimals for large, 2 for small */
export function fmtCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

// All supported currencies with labels and symbols
export const CURRENCY_INFO: Record<Currency, { label: string; flag: string }> = {
  PHP: { label: 'Philippine Peso', flag: '🇵🇭' },
  USD: { label: 'US Dollar',       flag: '🇺🇸' },
  EUR: { label: 'Euro',            flag: '🇪🇺' },
  GBP: { label: 'British Pound',   flag: '🇬🇧' },
  JPY: { label: 'Japanese Yen',    flag: '🇯🇵' },
  SGD: { label: 'Singapore Dollar',flag: '🇸🇬' },
  AUD: { label: 'Australian Dollar',flag:'🇦🇺' },
  CAD: { label: 'Canadian Dollar', flag: '🇨🇦' },
  HKD: { label: 'Hong Kong Dollar',flag: '🇭🇰' },
};
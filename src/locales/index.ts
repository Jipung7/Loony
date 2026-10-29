import { en, TranslationDictionary } from './en';
import { id } from './id';
import { AppLanguage } from '../types';

export { en, id };
export type { TranslationDictionary };

export const DICTIONARIES: Record<AppLanguage, TranslationDictionary> = {
  en,
  id,
};

/**
 * Mengambil kamus bahasa aktif
 */
export function getDictionary(lang: AppLanguage = 'en'): TranslationDictionary {
  return DICTIONARIES[lang] || DICTIONARIES.en;
}

/**
 * Menyisipkan parameter dinamis ke dalam template string
 * Contoh: interpolate("Next: {name} in {time}", { name: "Maghrib", time: "15m" })
 */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

/**
 * Pemformatan angka & simbol mata uang adaptif (Rp 50.000 vs $50.00 / $50)
 */
export function formatCurrency(amount: number, symbol?: string, lang: AppLanguage = 'en'): string {
  const sym = symbol || (lang === 'id' ? 'Rp' : '$');
  const num = Number(amount) || 0;
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const formattedNumber = num.toLocaleString(locale);

  if (sym.toLowerCase() === 'rp') {
    return `Rp ${formattedNumber}`;
  }
  return `${sym}${formattedNumber}`;
}

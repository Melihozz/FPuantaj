/**
 * Puantaj hesaplama sabitleri
 *
 * Resmi (sigortalı) ödeme tabanı burada TEK yerde tanımlıdır.
 * Frontend bu değeri GET /api/config/payroll ile buradan çeker; böylece
 * asgari ücret değiştiğinde sadece bu dosya (veya env) güncellenir.
 *
 * Değiştirmeden önce: bu değer geçmiş dönemlerin resmi/elden dağılımını da
 * yeniden hesaplar, çünkü dağılım okuma anında türetiliyor.
 */

/** Resmi ödeme tabanı (aylık). Env ile geçersiz kılınabilir: OFFICIAL_WAGE_BASE */
export const FIXED_OFFICIAL_PAYMENT = readPositiveNumber(
  process.env.OFFICIAL_WAGE_BASE,
  28075
);

/** Resmi tabanın bölündüğü gün sayısı. Env: OFFICIAL_WORKING_DAYS_BASE */
export const OFFICIAL_WORKING_DAYS_BASE = readPositiveNumber(
  process.env.OFFICIAL_WORKING_DAYS_BASE,
  30
);

function readPositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Geçersiz puantaj sabiti: "${raw}". Pozitif bir sayı olmalıdır.`
    );
  }
  return parsed;
}

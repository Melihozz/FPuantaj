import { ApiError } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface PayrollConfig {
  officialWageBase: number;
  officialWorkingDaysBase: number;
}

/**
 * Backend ulaşılamazsa kullanılacak değerler.
 * Backend'deki src/config/payroll.config.ts ile aynı olmalıdır.
 */
export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  officialWageBase: 28075,
  officialWorkingDaysBase: 30,
};

function createHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('puantaj_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Hesaplama sabitlerini backend'den çeker.
 * Hata durumunda varsayılanlara döner - tablo boş kalmasın diye.
 */
export async function getPayrollConfig(): Promise<PayrollConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/config/payroll`, {
      method: 'GET',
      headers: createHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        status: response.status,
        code: errorData.code || 'UNKNOWN_ERROR',
        message: errorData.message || 'Yapılandırma alınamadı',
      };
      throw error;
    }

    const data = (await response.json()) as Partial<PayrollConfig>;

    // Beklenmeyen/bozuk değer gelirse varsayılana düş
    if (
      typeof data.officialWageBase !== 'number' ||
      !Number.isFinite(data.officialWageBase) ||
      data.officialWageBase <= 0 ||
      typeof data.officialWorkingDaysBase !== 'number' ||
      !Number.isFinite(data.officialWorkingDaysBase) ||
      data.officialWorkingDaysBase <= 0
    ) {
      return DEFAULT_PAYROLL_CONFIG;
    }

    return {
      officialWageBase: data.officialWageBase,
      officialWorkingDaysBase: data.officialWorkingDaysBase,
    };
  } catch {
    return DEFAULT_PAYROLL_CONFIG;
  }
}

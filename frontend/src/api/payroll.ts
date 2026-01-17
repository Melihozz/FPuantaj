import { Employee, ApiError } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types
export interface PayrollEntry {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  sortOrder: number;
  daysWorked: number;
  advance: number;
  officialAdvance: number;
  overtime50: number;
  overtime100: number;
  officialPayment: number;
  cashPayment: number;
  // Calculated fields
  dailyWage: number;
  earnedSalary: number;
  totalReceivable: number;
  // Employee info
  employee: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePayrollInput {
  daysWorked?: number;
  advance?: number;
  officialAdvance?: number;
  overtime50?: number;
  overtime100?: number;
  officialPayment?: number;
  cashPayment?: number;
  sortOrder?: number;
}

export interface BatchUpdateEntry {
  employeeId: string;
  month: number;
  year: number;
  daysWorked?: number;
  advance?: number;
  officialAdvance?: number;
  overtime50?: number;
  overtime100?: number;
  officialPayment?: number;
  cashPayment?: number;
  sortOrder?: number;
}

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('puantaj_token');
}

// Helper to create headers with auth
function createHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      status: response.status,
      code: errorData.code || 'UNKNOWN_ERROR',
      message: errorData.message || 'Bir hata oluştu',
      details: errorData.details,
    };
    throw error;
  }
  return response.json();
}

/**
 * Get payroll entries by month and year
 * Requirements: 4.1-4.6
 */
export async function getPayrollByMonth(month: number, year: number): Promise<PayrollEntry[]> {
  const response = await fetch(
    `${API_BASE_URL}/payroll?month=${month}&year=${year}`,
    {
      method: 'GET',
      headers: createHeaders(),
    }
  );
  return handleResponse<PayrollEntry[]>(response);
}

/**
 * Get payroll entry by ID
 */
export async function getPayrollById(id: string): Promise<PayrollEntry> {
  const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<PayrollEntry>(response);
}

/**
 * Update a payroll entry
 * Requirements: 4.1-4.7
 */
export async function updatePayroll(id: string, input: UpdatePayrollInput): Promise<PayrollEntry> {
  const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<PayrollEntry>(response);
}

/**
 * Batch update payroll entries
 * Requirements: 4.1-4.7
 */
export async function batchUpdatePayroll(entries: BatchUpdateEntry[]): Promise<PayrollEntry[]> {
  const response = await fetch(`${API_BASE_URL}/payroll/batch`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(entries),
  });
  return handleResponse<PayrollEntry[]>(response);
}

// Helper to check if error is an ApiError
export function isPayrollApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

// Helper to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

// Helper to get current month and year
export function getCurrentPeriod(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

// Month names in Turkish
export const MONTH_NAMES: Record<number, string> = {
  1: 'Ocak',
  2: 'Şubat',
  3: 'Mart',
  4: 'Nisan',
  5: 'Mayıs',
  6: 'Haziran',
  7: 'Temmuz',
  8: 'Ağustos',
  9: 'Eylül',
  10: 'Ekim',
  11: 'Kasım',
  12: 'Aralık',
};

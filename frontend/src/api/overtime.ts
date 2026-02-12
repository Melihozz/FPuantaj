import { ApiError, Employee } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface OvertimeEntry {
  id: string;
  employeeId: string;
  employee: Employee;
  entryDate: string;
  month: number;
  year: number;
  type: 'OVERTIME_50' | 'OVERTIME_100';
  multiplier: number;
  hours: number;
  amount: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOvertimeInput {
  employeeId: string;
  entryDate: string;
  month: number;
  year: number;
  type: 'OVERTIME_50' | 'OVERTIME_100';
  multiplier: number;
  hours: number;
  amount: number;
  description?: string | null;
}

function getAuthToken(): string | null {
  return localStorage.getItem('puantaj_token');
}

function createHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

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

export async function getOvertimeEntries(month: number, year: number, employeeId?: string): Promise<OvertimeEntry[]> {
  const url = new URL(`${API_BASE_URL}/overtime`);
  url.searchParams.set('month', String(month));
  url.searchParams.set('year', String(year));
  if (employeeId) url.searchParams.set('employeeId', employeeId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<OvertimeEntry[]>(response);
}

export async function createOvertime(input: CreateOvertimeInput): Promise<OvertimeEntry> {
  const response = await fetch(`${API_BASE_URL}/overtime`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<OvertimeEntry>(response);
}

export async function deleteOvertime(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/overtime/${id}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });
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
}

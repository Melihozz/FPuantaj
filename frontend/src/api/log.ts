import { ApiError } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'EMPLOYEE' | 'PAYROLL';

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  changes: FieldChange[];
  timestamp: string;
}

export interface PaginatedLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
 * Get all audit logs with pagination
 * Requirements: 7.1, 7.2
 */
export async function getAllLogs(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedLogsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/logs?page=${page}&pageSize=${pageSize}`,
    {
      method: 'GET',
      headers: createHeaders(),
    }
  );
  return handleResponse<PaginatedLogsResponse>(response);
}

/**
 * Get audit logs for a specific entity
 * Requirements: 7.2
 */
export async function getLogsByEntityId(entityId: string): Promise<AuditLog[]> {
  const response = await fetch(`${API_BASE_URL}/logs/${entityId}`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<AuditLog[]>(response);
}

// Helper to check if error is an ApiError
export function isLogApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

// Action type display names in Turkish
export const ACTION_LABELS: Record<ActionType, string> = {
  CREATE: 'Ekleme',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
};

// Entity type display names in Turkish
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  EMPLOYEE: 'Çalışan',
  PAYROLL: 'Puantaj',
};

// Field name display names in Turkish
export const FIELD_LABELS: Record<string, string> = {
  fullName: 'Ad Soyad',
  workArea: 'Çalışma Alanı',
  isInsured: 'Sigorta Durumu',
  startDate: 'İşe Giriş Tarihi',
  endDate: 'İşten Çıkış Tarihi',
  salary: 'Maaş',
  workingDays: 'Çalışma Gün Sayısı',
  daysWorked: 'Çalıştığı Gün',
  advance: 'Avans',
  overtime50: '%50 Mesai',
  overtime100: '%100 Mesai',
  officialPayment: 'Resmi Ödeme',
  cashPayment: 'Elden Ödeme',
};

// Helper to format field name
export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

// Helper to format timestamp
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Helper to format date only
export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('tr-TR');
}

// Helper to format time only
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

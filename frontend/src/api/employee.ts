const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types
export type WorkArea =
  | 'DEPO'
  | 'URETIM'
  | 'OFIS'
  | 'SAHA_ELEMANI'
  | 'KAYSERI_YATAS'
  | 'ANKARA_YATAS'
  | 'ISTANBUL_YATAS'
  | 'DIGER';

export interface Employee {
  id: string;
  fullName: string;
  workArea: WorkArea;
  isInsured: boolean;
  startDate: string;
  endDate: string | null;
  salary: number;
  workingDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeInput {
  fullName: string;
  workArea: WorkArea;
  isInsured: boolean;
  startDate: string;
  endDate?: string | null;
  salary: number;
  workingDays?: number;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  workArea?: WorkArea;
  isInsured?: boolean;
  startDate?: string;
  endDate?: string | null;
  salary?: number;
  workingDays?: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
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
  
  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

/**
 * Get all employees
 */
export async function getAllEmployees(): Promise<Employee[]> {
  const response = await fetch(`${API_BASE_URL}/employees`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<Employee[]>(response);
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: string): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<Employee>(response);
}

/**
 * Create a new employee
 */
export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/employees`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Employee>(response);
}

/**
 * Update an existing employee
 */
export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Employee>(response);
}

/**
 * Delete an employee
 */
export async function deleteEmployee(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });
  await handleResponse<void>(response);
}

// Work area display names
export const WORK_AREA_LABELS: Record<WorkArea, string> = {
  DEPO: 'Depo',
  URETIM: 'Üretim',
  OFIS: 'Ofis',
  SAHA_ELEMANI: 'İstanbul Saha',
  KAYSERI_YATAS: 'Kayseri Yataş',
  ANKARA_YATAS: 'Ankara Yataş',
  ISTANBUL_YATAS: 'İstanbul Yataş',
  DIGER: 'Diğer',
};

// Helper to check if error is an ApiError
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'code' in error &&
    'message' in error
  );
}

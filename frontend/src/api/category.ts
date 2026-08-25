import { ApiError } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Category {
  id: string;
  /** Makine-okunur kod - Employee.workArea bu değeri tutar, asla değişmez */
  code: string;
  /** Ekranda görünen ad - kullanıcı değiştirebilir */
  label: string;
  sortOrder: number;
  employeeCount: number;
}

function createHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('puantaj_token');
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
  if (response.status === 204) return {} as T;
  return response.json();
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<Category[]>(response);
}

export async function createCategory(label: string): Promise<Category> {
  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ label }),
  });
  return handleResponse<Category>(response);
}

export async function updateCategory(
  id: string,
  input: { label?: string; sortOrder?: number }
): Promise<Category> {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Category>(response);
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });
  await handleResponse<void>(response);
}

/** Verilen id sırasına göre kategorileri yeniden sıralar */
export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/categories/reorder`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ ids }),
  });
  return handleResponse<Category[]>(response);
}

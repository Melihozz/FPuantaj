import { ApiError, Employee } from './employee';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface TrafficFinePayment {
  id: string;
  trafficFineId: string;
  paymentDate: string;
  amount: number;
  createdAt: string;
}

export interface TrafficFine {
  id: string;
  employeeId: string;
  fineDate: string;
  amount: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee;
  payments: TrafficFinePayment[];
}

export interface CreateTrafficFineInput {
  employeeId: string;
  fineDate: string;
  amount: number;
  description?: string | null;
}

export interface CreateTrafficFinePaymentInput {
  paymentDate: string;
  amount: number;
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
  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }
  return response.json();
}

export async function getTrafficFines(employeeId?: string): Promise<TrafficFine[]> {
  const url = new URL(`${API_BASE_URL}/traffic-fines`);
  if (employeeId) url.searchParams.set('employeeId', employeeId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createHeaders(),
  });
  return handleResponse<TrafficFine[]>(response);
}

export async function createTrafficFine(input: CreateTrafficFineInput): Promise<TrafficFine> {
  const response = await fetch(`${API_BASE_URL}/traffic-fines`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<TrafficFine>(response);
}

export async function addTrafficFinePayment(
  trafficFineId: string,
  input: CreateTrafficFinePaymentInput
): Promise<TrafficFinePayment> {
  const response = await fetch(`${API_BASE_URL}/traffic-fines/${trafficFineId}/payments`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<TrafficFinePayment>(response);
}

export async function deleteTrafficFine(trafficFineId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/traffic-fines/${trafficFineId}`, {
    method: 'DELETE',
    headers: createHeaders(),
  });
  await handleResponse<void>(response);
}

export function sumPayments(payments: TrafficFinePayment[]): number {
  return payments.reduce((acc, p) => acc + (p.amount || 0), 0);
}


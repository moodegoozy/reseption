import { DailySummaryRow, EmployeeSummary, LoginResponse, ShiftReport } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

async function request<T>(
  path: string,
  options: { method?: HttpMethod; token?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = 'فشل الطلب، يرجى المحاولة مرة أخرى لاحقاً.';

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch (error) {
      // ignore parsing error and use default message
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/login', {
    method: 'POST',
    body: { username, password }
  });
}

export async function logout(token: string): Promise<void> {
  await request<void>('/api/logout', { method: 'POST', token });
}

export async function fetchEmployees(token: string): Promise<EmployeeSummary[]> {
  return request<EmployeeSummary[]>('/api/employees', { token });
}

export async function fetchReports(token: string, date?: string): Promise<ShiftReport[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return request<ShiftReport[]>(`/api/reports${query}`, { token });
}

export async function submitReport(
  token: string,
  payload: Partial<ShiftReport> & { shift: string; date: string; employeeId?: string }
): Promise<ShiftReport> {
  return request<ShiftReport>('/api/reports', {
    method: 'POST',
    token,
    body: payload
  });
}

export async function deleteReport(token: string, reportId: string): Promise<void> {
  await request<void>(`/api/reports/${reportId}`, { method: 'DELETE', token });
}

export async function fetchSummary(token: string, date: string): Promise<DailySummaryRow[]> {
  const query = `?date=${encodeURIComponent(date)}`;
  return request<DailySummaryRow[]>(`/api/summary${query}`, { token });
}

export async function sendDailySummary(token: string, date?: string): Promise<unknown> {
  return request<unknown>('/api/admin/send-summary', {
    method: 'POST',
    token,
    body: date ? { date } : {}
  });
}

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL 
    || (import.meta as any).env?.VITE_INVERBAN_API_URL 
    || 'http://localhost:5002/api';

  return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

const API_BASE_URL = getBaseUrl();

export interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export const apiClient = {
  getApiKey(): string {
    return localStorage.getItem('X-API-KEY') || 'IVB-ADMIN-ARMANDO-7722-BANEGAS-9911';
  },

  setApiKey(key: string) {
    localStorage.setItem('X-API-KEY', key);
  },

  getJwtToken(): string {
    return localStorage.getItem('JWT_TOKEN') || '';
  },

  setJwtToken(token: string) {
    localStorage.setItem('JWT_TOKEN', token);
  },

  async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;
    
    let url = `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': this.getApiKey(),
    };

    const token = this.getJwtToken();
    if (token && token.length > 0) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      } as HeadersInit,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || errorBody.Error || errorBody.message || errorBody.Message || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  },

  get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body: any, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

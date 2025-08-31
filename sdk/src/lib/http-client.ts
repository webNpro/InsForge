import { InsForgeConfig, ApiError, InsForgeError } from '../types';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class HttpClient {
  private baseUrl: string;
  private fetch: typeof fetch;
  private defaultHeaders: Record<string, string>;

  constructor(config: InsForgeConfig) {
    this.baseUrl = config.url || 'http://localhost:7130';
    // Properly bind fetch to maintain its context
    this.fetch = config.fetch || (globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined as any);
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    // Add API key if provided
    if (config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${config.apiKey}`;
    }

    if (!this.fetch) {
      throw new Error(
        'Fetch is not available. Please provide a fetch implementation in the config.'
      );
    }
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, headers = {}, body, ...fetchOptions } = options;
    
    const url = this.buildUrl(path, params);
    
    const response = await this.fetch(url, {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Try to parse JSON response
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      // For non-JSON responses, return text
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      if (data && typeof data === 'object' && 'error' in data) {
        throw InsForgeError.fromApiError(data as ApiError);
      }
      throw new InsForgeError(
        `Request failed: ${response.statusText}`,
        response.status,
        'REQUEST_FAILED'
      );
    }

    return data as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }
}
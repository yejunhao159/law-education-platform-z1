/**
 * 基础API客户端
 * DeepPractice Standards Compliant
 */

import type { ApiResponse } from '@/src/types';

// ========== 配置接口 ==========
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// ========== 请求选项 ==========
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

// ========== 错误类型 ==========
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = '请求超时') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ========== 基础API客户端 ==========
export class BaseApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: '',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  // ========== 私有方法 ==========
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private prepareRequestBody(data: unknown): { body?: string | FormData | Blob | ReadableStream; shouldRemoveContentType?: boolean } {
    if (!data) {
      return { body: undefined };
    }

    // FormData、Blob、ReadableStream 直接透传，不序列化
    if (data instanceof FormData || data instanceof Blob || data instanceof ReadableStream) {
      return { body: data, shouldRemoveContentType: true };
    }

    // 其他类型JSON序列化
    return { body: JSON.stringify(data) };
  }

  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  private async handleResponse<T>(response: Response, responseType?: string): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    let data: unknown;

    try {
      // 根据responseType或content-type决定如何解析响应
      if (responseType === 'blob' || (!responseType && (contentType?.includes('application/octet-stream') || contentType?.includes('application/pdf') || contentType?.includes('image/')))) {
        data = await response.blob();
      } else if (responseType === 'arrayBuffer') {
        data = await response.arrayBuffer();
      } else if (responseType === 'text' || (!responseType && contentType && !contentType.includes('application/json'))) {
        data = await response.text();
      } else {
        // 默认尝试JSON解析
        data = await response.json();
      }
    } catch (error) {
      throw new ApiError(
        '响应解析失败',
        response.status,
        'PARSE_ERROR',
        response
      );
    }

    if (!response.ok) {
      const errorData = data as { message?: string; error?: string; code?: string };
      throw new ApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData.code || 'HTTP_ERROR',
        response
      );
    }

    // 如果响应已经是ApiResponse格式，直接返回
    if (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      'timestamp' in data
    ) {
      return data as ApiResponse<T>;
    }

    // 否则包装成ApiResponse格式
    return {
      success: true,
      data: data as T,
      timestamp: new Date().toISOString(),
    };
  }

  private async executeRequest<T>(
    url: string,
    options: RequestInit & RequestOptions & { shouldRemoveContentType?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.config.timeout,
      retries = this.config.retries,
      headers = {},
      signal,
      shouldRemoveContentType,
      responseType,
      ...fetchOptions
    } = options;

    let mergedHeaders = {
      ...this.config.headers,
      ...headers,
    };

    // 如果需要移除 Content-Type（用于 FormData 等）
    if (shouldRemoveContentType) {
      const { 'Content-Type': contentType, ...headersWithoutContentType } = mergedHeaders;
      mergedHeaders = headersWithoutContentType;
    }

    let lastError: Error;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        let abortSignal: AbortSignal;
        if (signal) {
          // 如果传入了外部signal，直接使用
          abortSignal = signal;
        } else {
          // 否则创建内部超时控制器
          const controller = this.createAbortController(timeout);
          abortSignal = controller.signal;
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers: mergedHeaders,
          signal: abortSignal,
        });

        return await this.handleResponse<T>(response, responseType);
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // 如果是AbortError且不是用户主动取消，转换为TimeoutError
        if (error instanceof Error && error.name === 'AbortError' && !signal) {
          lastError = new TimeoutError();
        }

        // 如果是网络错误，包装为NetworkError
        if (error instanceof TypeError) {
          lastError = new NetworkError('网络连接失败', error);
        }

        // 最后一次重试失败，抛出错误
        if (attempt > retries) {
          break;
        }

        // 等待重试间隔
        if (attempt <= retries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  // ========== 公共方法 ==========
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return this.executeRequest<T>(url.toString(), {
      method: 'GET',
      ...options,
    });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL).toString();
    const { body, shouldRemoveContentType } = this.prepareRequestBody(data);

    return this.executeRequest<T>(url, {
      method: 'POST',
      body,
      shouldRemoveContentType,
      ...options,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL).toString();
    const { body, shouldRemoveContentType } = this.prepareRequestBody(data);

    return this.executeRequest<T>(url, {
      method: 'PUT',
      body,
      shouldRemoveContentType,
      ...options,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL).toString();
    const { body, shouldRemoveContentType } = this.prepareRequestBody(data);

    return this.executeRequest<T>(url, {
      method: 'PATCH',
      body,
      shouldRemoveContentType,
      ...options,
    });
  }

  async delete<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.config.baseURL).toString();

    return this.executeRequest<T>(url, {
      method: 'DELETE',
      ...options,
    });
  }

  // ========== 配置方法 ==========
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }

  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.config.headers, headers);
  }

  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }

  setRetries(retries: number, delay?: number): void {
    this.config.retries = retries;
    if (delay !== undefined) {
      this.config.retryDelay = delay;
    }
  }
}
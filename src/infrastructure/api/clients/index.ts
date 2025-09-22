/**
 * API客户端统一导出
 * DeepPractice Standards Compliant
 */

import { BaseApiClient } from './base';

// ========== 创建默认客户端实例 ==========
export const apiClient = new BaseApiClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== 环境配置 ==========
if (typeof window !== 'undefined') {
  // 浏览器环境：从环境变量设置API基础URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    apiClient.setBaseURL(apiUrl);
  }
} else {
  // 服务器环境：使用内部API
  apiClient.setBaseURL('http://localhost:3000');
}

// ========== 导出 ==========
export { BaseApiClient } from './base';
export type {
  ApiClientConfig,
  RequestOptions,
} from './base';

export {
  ApiError,
  NetworkError,
  TimeoutError,
} from './base';

// ========== 默认导出 ==========
export default apiClient;
/**
 * API客户端集成测试
 * DeepPractice Standards Compliant
 */

import { BaseApiClient } from '@/src/infrastructure/api/clients/base';
import { ApiError } from '@/src/types';

// 模拟fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BaseApiClient', () => {
  let client: BaseApiClient;

  beforeEach(() => {
    client = new BaseApiClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      retries: 2,
    });
    mockFetch.mockClear();
  });

  describe('GET请求', () => {
    it('应该能发送成功的GET请求', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: '测试' },
        message: '成功'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该能处理带查询参数的GET请求', async () => {
      const mockResponse = { success: true, data: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      await client.get('/test', { page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('POST请求', () => {
    it('应该能发送POST请求', async () => {
      const mockResponse = { success: true, data: { id: 1 } };
      const postData = { name: '测试案例' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.post('/test', postData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('PUT请求', () => {
    it('应该能发送PUT请求', async () => {
      const mockResponse = { success: true, data: { id: 1, updated: true } };
      const putData = { name: '更新的案例' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.put('/test/1', putData);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putData),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('DELETE请求', () => {
    it('应该能发送DELETE请求', async () => {
      const mockResponse = { success: true, message: '删除成功' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await client.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('错误处理', () => {
    it('应该能处理HTTP错误状态', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '资源未找到',
          details: {}
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce(errorResponse),
      });

      await expect(client.get('/not-found')).rejects.toThrow(ApiError);
    });

    it('应该能处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });

    it('应该能处理JSON解析错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      await expect(client.get('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  // 拦截器功能可能在未来的版本中实现

  describe('重试机制', () => {
    it('应该在请求失败时进行重试', async () => {
      // 前两次失败，第三次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: jest.fn().mockResolvedValueOnce({ success: true }),
        });

      const result = await client.get('/test', {}, { retries: 3 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('应该在达到最大重试次数后失败', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(
        client.get('/test', {}, { retries: 2 })
      ).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(3); // 1次初始 + 2次重试
    });
  });

  describe('超时处理', () => {
    it('应该在超时时取消请求', async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementationOnce(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              headers: new Headers({ 'content-type': 'application/json' }),
              json: jest.fn().mockResolvedValueOnce({ success: true }),
            });
          }, 10000); // 10秒后响应
        })
      );

      const requestPromise = client.get('/test', {}, { timeout: 5000 }); // 5秒超时

      jest.advanceTimersByTime(5000);

      await expect(requestPromise).rejects.toThrow();

      jest.useRealTimers();
    });
  });

  describe('自定义选项', () => {
    it('应该能处理自定义headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });

      await client.get('/test', {}, {
        headers: {
          'Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });
});
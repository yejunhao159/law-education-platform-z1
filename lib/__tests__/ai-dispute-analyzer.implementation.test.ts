/**
 * TDD Tests for Dispute Analysis Service Implementation
 * Testing the actual DisputeAnalyzer class functionality
 */

import { DisputeAnalyzer } from '../ai-dispute-analyzer';
import type { 
  DisputeAnalysisRequest, 
  DisputeAnalysisResponse,
  DisputeCacheConfig 
} from '../ai-dispute-analyzer';

// Mock the fetch function
global.fetch = jest.fn();

describe('DisputeAnalyzer Implementation', () => {
  let analyzer: DisputeAnalyzer;

  beforeEach(() => {
    analyzer = new DisputeAnalyzer();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default config', () => {
      const analyzer = new DisputeAnalyzer();
      expect(analyzer).toBeDefined();
      expect(analyzer.config).toBeDefined();
      expect(analyzer.config.enabled).toBe(true);
      expect(analyzer.config.ttl).toBe(3600);
    });

    it('should create instance with custom config', () => {
      const customConfig: Partial<DisputeCacheConfig> = {
        enabled: false,
        ttl: 7200,
        maxSize: 100,
        keyPrefix: 'custom_'
      };
      const analyzer = new DisputeAnalyzer(customConfig);
      expect(analyzer.config.enabled).toBe(false);
      expect(analyzer.config.ttl).toBe(7200);
      expect(analyzer.config.keyPrefix).toBe('custom_');
    });
  });

  describe('Analyze Method', () => {
    it('should analyze document and return disputes', async () => {
      const request: DisputeAnalysisRequest = {
        documentText: '原告主张合同有效，被告认为合同无效。法院认定合同部分有效。',
        caseType: 'civil',
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        }
      };

      const mockResponse = {
        success: true,
        disputes: [
          {
            id: 'dispute-1',
            content: '合同效力争议',
            plaintiffView: '原告主张合同有效',
            defendantView: '被告认为合同无效',
            courtView: '法院认定合同部分有效',
            claimBasis: [],
            difficulty: 'basic',
            teachingValue: 'high',
            relatedLaws: [],
            createdAt: new Date().toISOString()
          }
        ],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 1500,
          modelVersion: 'deepseek-chat',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      const response = await analyzer.analyze(request);
      
      expect(response.success).toBe(true);
      expect(response.disputes).toHaveLength(1);
      expect(response.disputes[0].content).toBe('合同效力争议');
      expect(response.metadata.confidence).toBe(0.85);
    });

    it('should handle API errors gracefully', async () => {
      const request: DisputeAnalysisRequest = {
        documentText: '测试文档',
        caseType: 'civil',
        options: {
          extractClaimBasis: false,
          analyzeDifficulty: false,
          generateTeachingNotes: false
        }
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const response = await analyzer.analyze(request);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('API_ERROR');
      expect(response.disputes).toEqual([]);
    });

    it('should use cache when available', async () => {
      const request: DisputeAnalysisRequest = {
        documentText: '缓存测试文档',
        caseType: 'civil',
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        },
        caseId: 'test-case-1'
      };

      const mockResponse = {
        success: true,
        disputes: [{
          id: 'cached-dispute',
          content: '缓存的争议',
          plaintiffView: '原告观点',
          defendantView: '被告观点',
          courtView: '法院认定',
          claimBasis: [],
          difficulty: 'basic',
          teachingValue: 'medium',
          relatedLaws: [],
          createdAt: new Date().toISOString()
        }],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 0,
          modelVersion: 'deepseek-chat',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
          cacheHit: true
        }
      };

      // First call - should fetch from API
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      await analyzer.analyze(request);
      
      // Second call - should use cache
      const cachedResponse = await analyzer.analyze(request);
      
      expect(cachedResponse.metadata.cacheHit).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one API call
    });
  });

  describe('Batch Analysis', () => {
    it('should analyze multiple documents', async () => {
      const batchRequest = {
        documents: [
          { id: 'doc-1', text: '文档1', caseType: 'civil' as const },
          { id: 'doc-2', text: '文档2', caseType: 'criminal' as const }
        ],
        options: {
          extractClaimBasis: false,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        },
        parallel: false
      };

      const mockResponse = {
        success: true,
        disputes: [],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 1000,
          modelVersion: 'deepseek-chat',
          confidence: 0.8,
          timestamp: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      const result = await analyzer.analyzeBatch(batchRequest);
      
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle parallel batch processing', async () => {
      const batchRequest = {
        documents: [
          { id: 'doc-1', text: '文档1', caseType: 'civil' as const },
          { id: 'doc-2', text: '文档2', caseType: 'civil' as const },
          { id: 'doc-3', text: '文档3', caseType: 'civil' as const }
        ],
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        },
        parallel: true,
        maxConcurrency: 2
      };

      const mockResponse = {
        success: true,
        disputes: [],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 500,
          modelVersion: 'deepseek-chat',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      const result = await analyzer.analyzeBatch(batchRequest);
      
      expect(result.results).toHaveLength(3);
      expect(result.summary.total).toBe(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      analyzer.clearCache();
      expect(analyzer.getCacheSize()).toBe(0);
    });

    it('should get cache statistics', () => {
      const stats = analyzer.getStatistics();
      
      expect(stats.totalRequests).toBeDefined();
      expect(stats.successfulRequests).toBeDefined();
      expect(stats.failedRequests).toBeDefined();
      expect(stats.averageAnalysisTime).toBeDefined();
      expect(stats.cacheHitRate).toBeDefined();
    });

    it('should respect cache TTL', async () => {
      const analyzer = new DisputeAnalyzer({ ttl: 1 }); // 1 second TTL
      
      const request: DisputeAnalysisRequest = {
        documentText: 'TTL测试',
        caseType: 'civil',
        options: {
          extractClaimBasis: false,
          analyzeDifficulty: false,
          generateTeachingNotes: false
        },
        caseId: 'ttl-test'
      };

      const mockResponse = {
        success: true,
        disputes: [],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 100,
          modelVersion: 'deepseek-chat',
          confidence: 0.8,
          timestamp: new Date().toISOString()
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify(mockResponse)
            }
          }]
        })
      });

      // First call
      await analyzer.analyze(request);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call - should fetch again due to expired cache
      await analyzer.analyze(request);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Prompt Generation', () => {
    it('should generate appropriate prompts for different case types', () => {
      const civilPrompt = analyzer.generatePrompt('民事案件内容', 'civil', {
        extractClaimBasis: true,
        analyzeDifficulty: true,
        generateTeachingNotes: false
      });
      
      expect(civilPrompt).toContain('民事');
      expect(civilPrompt).toContain('请求权基础');
      expect(civilPrompt).toContain('难度');
    });

    it('should include teaching notes when requested', () => {
      const prompt = analyzer.generatePrompt('案件内容', 'civil', {
        extractClaimBasis: false,
        analyzeDifficulty: false,
        generateTeachingNotes: true
      });
      
      expect(prompt).toContain('教学');
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      const request: DisputeAnalysisRequest = {
        documentText: '超时测试',
        caseType: 'civil',
        options: {
          extractClaimBasis: false,
          analyzeDifficulty: false,
          generateTeachingNotes: false
        }
      };

      // Simulate timeout
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const response = await analyzer.analyze(request);
      
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TIMEOUT');
    });

    it('should validate input documents', async () => {
      const request: DisputeAnalysisRequest = {
        documentText: '', // Empty document
        caseType: 'civil',
        options: {
          extractClaimBasis: false,
          analyzeDifficulty: false,
          generateTeachingNotes: false
        }
      };

      const response = await analyzer.analyze(request);
      
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('INVALID_DOCUMENT');
    });
  });
});
/**
 * TDD Tests for Dispute Analysis Service Type Definitions
 * Test-first approach for AI service interfaces
 */

import {
  DisputeAnalysisRequest,
  DisputeAnalysisResponse,
  ClaimBasisMapping,
  DisputeExtractionOptions,
  DisputeAnalysisError,
  DisputeAnalysisStatus,
  DisputeSeverity
} from '../ai-dispute-analyzer';

describe('Dispute Analysis Service Types', () => {
  describe('DisputeAnalysisRequest Interface', () => {
    it('should define request structure with required fields', () => {
      const request: DisputeAnalysisRequest = {
        documentText: '判决书内容...',
        caseType: 'civil',
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: false
        }
      };

      expect(request.documentText).toBeDefined();
      expect(request.caseType).toMatch(/^(civil|criminal|administrative)$/);
      expect(request.options).toBeDefined();
    });

    it('should allow optional fields', () => {
      const request: DisputeAnalysisRequest = {
        documentText: '判决书内容...',
        caseType: 'civil',
        options: {
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: true
        },
        caseId: 'case-123',
        userId: 'user-456',
        sessionId: 'session-789'
      };

      expect(request.caseId).toBeDefined();
      expect(request.userId).toBeDefined();
      expect(request.sessionId).toBeDefined();
    });
  });

  describe('DisputeAnalysisResponse Interface', () => {
    it('should define response structure', () => {
      const response: DisputeAnalysisResponse = {
        success: true,
        disputes: [],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 1500,
          modelVersion: 'deepseek-chat',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        }
      };

      expect(response.success).toBe(true);
      expect(response.disputes).toBeDefined();
      expect(response.claimBasisMappings).toBeDefined();
      expect(response.metadata.analysisTime).toBeGreaterThan(0);
      expect(response.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(response.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle error response', () => {
      const errorResponse: DisputeAnalysisResponse = {
        success: false,
        disputes: [],
        claimBasisMappings: [],
        error: {
          code: 'ANALYSIS_FAILED',
          message: '分析失败',
          details: 'API调用超时'
        },
        metadata: {
          analysisTime: 0,
          modelVersion: 'deepseek-chat',
          confidence: 0,
          timestamp: new Date().toISOString()
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error?.code).toBeDefined();
    });
  });

  describe('ClaimBasisMapping Interface', () => {
    it('should map disputes to claim basis', () => {
      const mapping: ClaimBasisMapping = {
        disputeId: 'dispute-1',
        claimBasisId: 'claim-1',
        relevance: 0.9,
        explanation: '该争议直接关系到合同履行请求权的成立'
      };

      expect(mapping.disputeId).toBeDefined();
      expect(mapping.claimBasisId).toBeDefined();
      expect(mapping.relevance).toBeGreaterThanOrEqual(0);
      expect(mapping.relevance).toBeLessThanOrEqual(1);
      expect(mapping.explanation).toBeDefined();
    });

    it('should support optional auto-mapping flag', () => {
      const mapping: ClaimBasisMapping = {
        disputeId: 'dispute-2',
        claimBasisId: 'claim-2',
        relevance: 0.75,
        explanation: 'AI自动识别的关联',
        isAutoMapped: true,
        confidence: 0.8
      };

      expect(mapping.isAutoMapped).toBe(true);
      expect(mapping.confidence).toBeDefined();
    });
  });

  describe('DisputeExtractionOptions Interface', () => {
    it('should define extraction options', () => {
      const options: DisputeExtractionOptions = {
        extractClaimBasis: true,
        analyzeDifficulty: true,
        generateTeachingNotes: false,
        maxDisputes: 10,
        minConfidence: 0.7,
        language: 'zh-CN'
      };

      expect(options.extractClaimBasis).toBeDefined();
      expect(options.analyzeDifficulty).toBeDefined();
      expect(options.generateTeachingNotes).toBeDefined();
      expect(options.maxDisputes).toBeGreaterThan(0);
      expect(options.minConfidence).toBeGreaterThanOrEqual(0);
      expect(options.minConfidence).toBeLessThanOrEqual(1);
      expect(options.language).toMatch(/^(zh-CN|en-US)$/);
    });
  });

  describe('DisputeAnalysisError Type', () => {
    it('should define error structure', () => {
      const error: DisputeAnalysisError = {
        code: 'INVALID_DOCUMENT',
        message: '文档格式无效',
        details: '无法解析判决书内容',
        timestamp: Date.now(),
        retryable: false
      };

      expect(error.code).toMatch(/^(ANALYSIS_FAILED|INVALID_DOCUMENT|API_ERROR|TIMEOUT|RATE_LIMIT)$/);
      expect(error.message).toBeDefined();
      expect(error.timestamp).toBeGreaterThan(0);
      expect(typeof error.retryable).toBe('boolean');
    });
  });

  describe('DisputeAnalysisStatus Enum', () => {
    it('should define status values', () => {
      const statuses: DisputeAnalysisStatus[] = [
        'pending',
        'analyzing',
        'completed',
        'failed',
        'cached'
      ];

      statuses.forEach(status => {
        expect(status).toMatch(/^(pending|analyzing|completed|failed|cached)$/);
      });
    });
  });

  describe('DisputeSeverity Type', () => {
    it('should categorize dispute severity', () => {
      const severities: DisputeSeverity[] = [
        'critical',
        'major',
        'minor',
        'informational'
      ];

      severities.forEach(severity => {
        expect(severity).toMatch(/^(critical|major|minor|informational)$/);
      });
    });
  });
});
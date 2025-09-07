/**
 * TDD Tests for Evidence Mapping Service
 * Testing the evidence-to-claim element mapping functionality
 */

import { EvidenceMappingService } from '../evidence-mapping-service';
import type { DisputeFocus, ClaimBasis, ClaimElement } from '@/types/dispute-evidence';

describe('EvidenceMappingService', () => {
  let service: EvidenceMappingService;

  beforeEach(() => {
    service = new EvidenceMappingService();
  });

  describe('Constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EvidenceMappingService);
    });
  });

  describe('Auto Mapping', () => {
    it('should automatically map evidence to claim elements', () => {
      const evidence = {
        id: 'evidence-1',
        content: '双方签订了书面合同',
        type: 'document'
      };

      const claimElements: ClaimElement[] = [
        {
          id: 'element-1',
          claimBasisId: 'claim-1',
          name: '合同成立',
          description: '需要证明合同已经成立',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'element-2',
          claimBasisId: 'claim-1',
          name: '违约行为',
          description: '需要证明存在违约',
          required: true,
          proved: false,
          supportingEvidence: []
        }
      ];

      const mappings = service.autoMapEvidence(evidence, claimElements);
      
      expect(mappings).toHaveLength(1);
      expect(mappings[0].evidenceId).toBe('evidence-1');
      expect(mappings[0].elementId).toBe('element-1');
      expect(mappings[0].confidence).toBeGreaterThan(0.5);
    });

    it('should calculate relevance scores', () => {
      const evidence = {
        id: 'evidence-1',
        content: '原告已支付全部款项',
        type: 'payment'
      };

      const element: ClaimElement = {
        id: 'element-1',
        claimBasisId: 'claim-1',
        name: '履行义务',
        description: '原告已经履行合同义务',
        required: true,
        proved: false,
        supportingEvidence: []
      };

      const score = service.calculateRelevance(evidence, element);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should map multiple evidence to multiple elements', () => {
      const evidenceList = [
        { id: 'ev-1', content: '合同文本', type: 'document' },
        { id: 'ev-2', content: '付款凭证', type: 'payment' },
        { id: 'ev-3', content: '证人证言', type: 'testimony' }
      ];

      const elements: ClaimElement[] = [
        {
          id: 'el-1',
          claimBasisId: 'claim-1',
          name: '合同成立',
          description: '合同成立要件',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'el-2',
          claimBasisId: 'claim-1',
          name: '履行义务',
          description: '已履行义务',
          required: true,
          proved: false,
          supportingEvidence: []
        }
      ];

      const mappings = service.batchAutoMap(evidenceList, elements);
      
      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.every(m => m.confidence > 0)).toBe(true);
    });
  });

  describe('Manual Mapping', () => {
    it('should create manual mapping', () => {
      const mapping = service.createManualMapping(
        'evidence-1',
        'element-1',
        'User manually mapped this evidence'
      );

      expect(mapping.evidenceId).toBe('evidence-1');
      expect(mapping.elementId).toBe('element-1');
      expect(mapping.isManual).toBe(true);
      expect(mapping.confidence).toBe(1);
      expect(mapping.reason).toBe('User manually mapped this evidence');
    });

    it('should validate manual mapping', () => {
      const validMapping = {
        evidenceId: 'evidence-1',
        elementId: 'element-1',
        isManual: true
      };

      const invalidMapping = {
        evidenceId: '',
        elementId: 'element-1',
        isManual: true
      };

      expect(service.validateMapping(validMapping)).toBe(true);
      expect(service.validateMapping(invalidMapping)).toBe(false);
    });
  });

  describe('Mapping Analysis', () => {
    it('should analyze mapping quality', () => {
      const mappings = [
        {
          evidenceId: 'ev-1',
          elementId: 'el-1',
          confidence: 0.9,
          isManual: false
        },
        {
          evidenceId: 'ev-2',
          elementId: 'el-2',
          confidence: 0.6,
          isManual: false
        },
        {
          evidenceId: 'ev-3',
          elementId: 'el-3',
          confidence: 1.0,
          isManual: true
        }
      ];

      const analysis = service.analyzeMappingQuality(mappings);
      
      expect(analysis.totalMappings).toBe(3);
      expect(analysis.averageConfidence).toBeCloseTo(0.833, 2);
      expect(analysis.manualMappings).toBe(1);
      expect(analysis.autoMappings).toBe(2);
      expect(analysis.lowConfidenceMappings).toBe(1);
    });

    it('should identify unmapped elements', () => {
      const elements: ClaimElement[] = [
        {
          id: 'el-1',
          claimBasisId: 'claim-1',
          name: 'Element 1',
          description: 'Description',
          required: true,
          proved: false,
          supportingEvidence: ['ev-1']
        },
        {
          id: 'el-2',
          claimBasisId: 'claim-1',
          name: 'Element 2',
          description: 'Description',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'el-3',
          claimBasisId: 'claim-1',
          name: 'Element 3',
          description: 'Description',
          required: false,
          proved: false,
          supportingEvidence: []
        }
      ];

      const unmapped = service.findUnmappedElements(elements);
      
      expect(unmapped).toHaveLength(2);
      expect(unmapped).toContain('el-2');
      expect(unmapped).toContain('el-3');
    });

    it('should identify conflicting mappings', () => {
      const mappings = [
        {
          evidenceId: 'ev-1',
          elementId: 'el-1',
          confidence: 0.8,
          isManual: false
        },
        {
          evidenceId: 'ev-1',
          elementId: 'el-2',
          confidence: 0.7,
          isManual: false
        }
      ];

      const conflicts = service.findConflictingMappings(mappings);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].evidenceId).toBe('ev-1');
      expect(conflicts[0].elementIds).toEqual(['el-1', 'el-2']);
    });
  });

  describe('Mapping Suggestions', () => {
    it('should suggest mappings for unmapped evidence', () => {
      const evidence = {
        id: 'ev-1',
        content: '合同签订日期为2024年1月1日',
        type: 'document'
      };

      const elements: ClaimElement[] = [
        {
          id: 'el-1',
          claimBasisId: 'claim-1',
          name: '合同时间',
          description: '合同签订时间',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'el-2',
          claimBasisId: 'claim-1',
          name: '支付金额',
          description: '应付金额',
          required: true,
          proved: false,
          supportingEvidence: []
        }
      ];

      const suggestions = service.suggestMappings(evidence, elements);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].elementId).toBe('el-1');
      expect(suggestions[0].confidence).toBeGreaterThan(0.5);
      expect(suggestions[0].reason).toContain('时间');
    });

    it('should rank suggestions by confidence', () => {
      const evidence = {
        id: 'ev-1',
        content: '原告支付了100万元定金',
        type: 'payment'
      };

      const elements: ClaimElement[] = [
        {
          id: 'el-1',
          claimBasisId: 'claim-1',
          name: '定金支付',
          description: '定金支付证明',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'el-2',
          claimBasisId: 'claim-1',
          name: '支付金额',
          description: '支付金额证明',
          required: true,
          proved: false,
          supportingEvidence: []
        },
        {
          id: 'el-3',
          claimBasisId: 'claim-1',
          name: '合同签订',
          description: '合同签订证明',
          required: true,
          proved: false,
          supportingEvidence: []
        }
      ];

      const suggestions = service.suggestMappings(evidence, elements);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(suggestions[1]?.confidence || 0);
    });
  });

  describe('Mapping Export/Import', () => {
    it('should export mappings to JSON', () => {
      const mappings = [
        {
          evidenceId: 'ev-1',
          elementId: 'el-1',
          confidence: 0.9,
          isManual: false
        }
      ];

      const exported = service.exportMappings(mappings);
      
      expect(exported).toBeDefined();
      expect(JSON.parse(exported)).toEqual(mappings);
    });

    it('should import mappings from JSON', () => {
      const mappingsJson = JSON.stringify([
        {
          evidenceId: 'ev-1',
          elementId: 'el-1',
          confidence: 0.9,
          isManual: false
        }
      ]);

      const imported = service.importMappings(mappingsJson);
      
      expect(imported).toHaveLength(1);
      expect(imported[0].evidenceId).toBe('ev-1');
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'not a valid json';
      
      const imported = service.importMappings(invalidJson);
      
      expect(imported).toEqual([]);
    });
  });

  describe('Integration with Disputes', () => {
    it('should map evidence to dispute-related elements', () => {
      const dispute: DisputeFocus = {
        id: 'dispute-1',
        content: '合同是否成立',
        plaintiffView: '合同已成立',
        defendantView: '合同未成立',
        courtView: '合同成立',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      const evidence = {
        id: 'ev-1',
        content: '书面合同原件',
        type: 'document'
      };

      const relevance = service.calculateDisputeRelevance(evidence, dispute);
      
      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });
  });
});
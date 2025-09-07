/**
 * TDD Tests for Dispute Evidence TypeScript Interfaces
 * Test-first approach to ensure type safety and correct structure
 */

import {
  DisputeFocus,
  EvidenceQuality,
  InteractionState,
  ClaimBasis,
  ClaimElement,
  FeedbackMessage,
  DifficultyLevel,
  TeachingValueLevel,
  ViewMode,
  QualityScore
} from '../dispute-evidence';

describe('Dispute Evidence Type Definitions', () => {
  describe('DisputeFocus Interface', () => {
    it('should have all required properties', () => {
      const dispute: DisputeFocus = {
        id: 'dispute-1',
        content: '合同是否有效成立',
        plaintiffView: '原告认为合同已经成立',
        defendantView: '被告认为合同未成立',
        courtView: '法院认定合同成立',
        claimBasis: [],
        difficulty: 'basic',
        teachingValue: 'high',
        relatedLaws: [],
        createdAt: new Date().toISOString()
      };

      expect(dispute.id).toBeDefined();
      expect(dispute.content).toBeDefined();
      expect(dispute.plaintiffView).toBeDefined();
      expect(dispute.defendantView).toBeDefined();
      expect(dispute.courtView).toBeDefined();
      expect(dispute.claimBasis).toBeDefined();
      expect(dispute.difficulty).toMatch(/^(basic|advanced|professional)$/);
      expect(dispute.teachingValue).toMatch(/^(high|medium|low)$/);
    });

    it('should accept optional properties', () => {
      const dispute: DisputeFocus = {
        id: 'dispute-2',
        content: '损害赔偿请求',
        plaintiffView: '原告主张',
        defendantView: '被告抗辩',
        courtView: '法院认定',
        claimBasis: [],
        difficulty: 'advanced',
        teachingValue: 'medium',
        relatedLaws: [],
        createdAt: new Date().toISOString(),
        aiAnalysis: 'AI分析结果',
        keyPoints: ['要点1', '要点2']
      };

      expect(dispute.aiAnalysis).toBeDefined();
      expect(dispute.keyPoints).toHaveLength(2);
    });
  });

  describe('EvidenceQuality Interface', () => {
    it('should have quality scores between 0 and 100', () => {
      const quality: EvidenceQuality = {
        id: 'quality-1',
        evidenceId: 'evidence-1',
        authenticity: 85,
        relevance: 90,
        legality: 95,
        supportedElements: ['element-1', 'element-2'],
        challengePoints: ['质疑点1'],
        overallScore: 90
      };

      expect(quality.authenticity).toBeGreaterThanOrEqual(0);
      expect(quality.authenticity).toBeLessThanOrEqual(100);
      expect(quality.relevance).toBeGreaterThanOrEqual(0);
      expect(quality.relevance).toBeLessThanOrEqual(100);
      expect(quality.legality).toBeGreaterThanOrEqual(0);
      expect(quality.legality).toBeLessThanOrEqual(100);
    });

    it('should calculate overall score correctly', () => {
      const quality: EvidenceQuality = {
        id: 'quality-2',
        evidenceId: 'evidence-2',
        authenticity: 80,
        relevance: 90,
        legality: 100,
        supportedElements: [],
        challengePoints: [],
        overallScore: 90 // (80 + 90 + 100) / 3
      };

      const expectedScore = Math.round((quality.authenticity + quality.relevance + quality.legality) / 3);
      expect(quality.overallScore).toBe(expectedScore);
    });
  });

  describe('InteractionState Interface', () => {
    it('should track drag and drop state', () => {
      const state: InteractionState = {
        draggedItem: 'evidence-1',
        dropTarget: 'element-1',
        flippedCards: new Set(['card-1', 'card-2']),
        completedMappings: new Map([
          ['evidence-1', 'element-1'],
          ['evidence-2', 'element-2']
        ]),
        score: 100,
        feedback: [],
        mode: 'practice',
        isAnimating: false
      };

      expect(state.draggedItem).toBeDefined();
      expect(state.dropTarget).toBeDefined();
      expect(state.flippedCards.size).toBe(2);
      expect(state.completedMappings.size).toBe(2);
      expect(state.mode).toMatch(/^(watch|practice)$/);
    });

    it('should handle feedback messages', () => {
      const feedback: FeedbackMessage = {
        id: 'feedback-1',
        type: 'success',
        message: '正确！',
        timestamp: Date.now()
      };

      const state: InteractionState = {
        draggedItem: null,
        dropTarget: null,
        flippedCards: new Set(),
        completedMappings: new Map(),
        score: 0,
        feedback: [feedback],
        mode: 'practice',
        isAnimating: false
      };

      expect(state.feedback[0].type).toMatch(/^(success|error|info|warning)$/);
      expect(state.feedback[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('ClaimBasis Interface', () => {
    it('should define claim basis structure', () => {
      const claimBasis: ClaimBasis = {
        id: 'claim-1',
        name: '合同履行请求权',
        legalBasis: '《民法典》第509条',
        elements: [],
        type: 'contractual'
      };

      expect(claimBasis.id).toBeDefined();
      expect(claimBasis.name).toBeDefined();
      expect(claimBasis.legalBasis).toBeDefined();
      expect(claimBasis.type).toMatch(/^(contractual|tortious|property|unjust_enrichment)$/);
    });
  });

  describe('ClaimElement Interface', () => {
    it('should define claim element structure', () => {
      const element: ClaimElement = {
        id: 'element-1',
        claimBasisId: 'claim-1',
        name: '合同成立',
        description: '双方达成合意',
        required: true,
        proved: false,
        supportingEvidence: ['evidence-1', 'evidence-2']
      };

      expect(element.id).toBeDefined();
      expect(element.claimBasisId).toBeDefined();
      expect(element.required).toBe(true);
      expect(element.proved).toBe(false);
      expect(element.supportingEvidence).toHaveLength(2);
    });
  });

  describe('Type Guards', () => {
    it('should validate difficulty levels', () => {
      const validLevels: DifficultyLevel[] = ['basic', 'advanced', 'professional'];
      validLevels.forEach(level => {
        expect(level).toMatch(/^(basic|advanced|professional)$/);
      });
    });

    it('should validate teaching value levels', () => {
      const validLevels: TeachingValueLevel[] = ['high', 'medium', 'low'];
      validLevels.forEach(level => {
        expect(level).toMatch(/^(high|medium|low)$/);
      });
    });

    it('should validate view modes', () => {
      const validModes: ViewMode[] = ['watch', 'practice'];
      validModes.forEach(mode => {
        expect(mode).toMatch(/^(watch|practice)$/);
      });
    });

    it('should validate quality scores', () => {
      const score: QualityScore = 85;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
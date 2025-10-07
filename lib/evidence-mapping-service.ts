/**
 * Evidence Mapping Service
 * Handles mapping between evidence and claim elements
 *
 * 类型迁移说明：
 * - Evidence类型已迁移至 @/types/evidence 统一定义
 * - 此处重新导出以保持向后兼容性
 * - 建议所有新代码直接从 @/types/evidence 导入
 */

import type { ClaimElement, DisputeFocus } from '@/types/dispute-evidence';
import type { Evidence } from '@/types/evidence';
import { normalizeEvidence, toSimpleEvidence, isCompleteEvidence } from '@/lib/adapters/evidence-adapter';

// 重新导出统一的Evidence类型，保持向后兼容
export type { Evidence };

export interface EvidenceMapping {
  evidenceId: string;
  elementId: string;
  confidence: number;
  isManual: boolean;
  reason?: string;
}

export interface MappingAnalysis {
  totalMappings: number;
  averageConfidence: number;
  manualMappings: number;
  autoMappings: number;
  lowConfidenceMappings: number;
  highConfidenceMappings?: number;
}

export interface MappingConflict {
  evidenceId: string;
  elementIds: string[];
}

export interface MappingSuggestion {
  elementId: string;
  confidence: number;
  reason: string;
}

export class EvidenceMappingService {
  private readonly confidenceThreshold = 0.3; // Lower threshold for more matches
  private readonly keywordWeights = new Map([
    ['合同', 0.8],
    ['签订', 0.75],
    ['书面', 0.6],
    ['支付', 0.85],
    ['履行', 0.75],
    ['违约', 0.8],
    ['损害', 0.7],
    ['证明', 0.6],
    ['时间', 0.7],
    ['金额', 0.8],
    ['定金', 0.85],
    ['赔偿', 0.75],
    ['成立', 0.7]
  ]);

  constructor() {}

  /**
   * Automatically map evidence to claim elements
   */
  autoMapEvidence(evidence: Evidence, claimElements: ClaimElement[]): EvidenceMapping[] {
    // 规范化证据数据，确保类型一致性
    const normalizedEvidence = isCompleteEvidence(evidence) ? evidence : normalizeEvidence(evidence);

    const mappings: EvidenceMapping[] = [];

    for (const element of claimElements) {
      const relevance = this.calculateRelevance(normalizedEvidence, element);
      
      if (relevance >= this.confidenceThreshold) {
        mappings.push({
          evidenceId: normalizedEvidence.id,
          elementId: element.id,
          confidence: relevance,
          isManual: false,
          reason: `Auto-mapped based on content similarity (${Math.round(relevance * 100)}%)`
        });
      }
    }

    return mappings;
  }

  /**
   * Calculate relevance score between evidence and claim element
   */
  calculateRelevance(evidence: Evidence, element: ClaimElement): number {
    const evidenceContent = (evidence.content || '').toLowerCase();
    const elementContent = `${element.name || ''} ${element.description || ''}`.toLowerCase();

    let score = 0;
    let matchCount = 0;

    // Check for keyword matches
    for (const [keyword, weight] of this.keywordWeights) {
      if (evidenceContent.includes(keyword) && elementContent.includes(keyword)) {
        score += weight;
        matchCount++;
      } else if (evidenceContent.includes(keyword) || elementContent.includes(keyword)) {
        // Partial match gets half weight
        score += weight * 0.3;
        matchCount += 0.5;
      }
    }

    // Check for direct term overlap
    const evidenceWords = evidenceContent.split(/\s+/);
    const elementWords = elementContent.split(/\s+/);
    const commonWords = evidenceWords.filter(word => 
      elementWords.includes(word) && word.length > 2
    );

    if (commonWords.length > 0) {
      score += commonWords.length * 0.1;
      matchCount += commonWords.length;
    }

    // Type-based scoring
    if (evidence.type === 'document' && element.name.includes('合同')) {
      score += 0.3;
      matchCount += 0.5;
    }
    if (evidence.type === 'payment' && (element.name.includes('支付') || element.name.includes('履行') || element.name.includes('金额'))) {
      score += 0.3;
      matchCount += 0.5;
    }
    if (evidence.type === 'testimony' && element.name.includes('证')) {
      score += 0.2;
      matchCount += 0.5;
    }

    // Base relevance for any evidence-element pair
    if (score === 0 && evidenceContent.length > 0 && elementContent.length > 0) {
      score = 0.1; // Minimum base score
    }

    // Normalize score
    const normalizedScore = matchCount > 0 ? Math.min(score / (matchCount + 1), 1) : score;
    return Math.max(0, Math.min(1, normalizedScore)); // Ensure between 0 and 1
  }

  /**
   * Batch auto-map multiple evidence to multiple elements
   */
  batchAutoMap(evidenceList: Evidence[], elements: ClaimElement[]): EvidenceMapping[] {
    // 批量规范化证据数据，提高性能
    const normalizedEvidenceList = evidenceList.map(evidence =>
      isCompleteEvidence(evidence) ? evidence : normalizeEvidence(evidence)
    );

    const allMappings: EvidenceMapping[] = [];

    for (const evidence of normalizedEvidenceList) {
      // 直接使用规范化后的证据，避免重复规范化
      const mappings: EvidenceMapping[] = [];
      for (const element of elements) {
        const relevance = this.calculateRelevance(evidence, element);

        if (relevance >= this.confidenceThreshold) {
          mappings.push({
            evidenceId: evidence.id,
            elementId: element.id,
            confidence: relevance,
            isManual: false,
            reason: `Auto-mapped based on content similarity (${Math.round(relevance * 100)}%)`
          });
        }
      }
      allMappings.push(...mappings);
    }

    return allMappings;
  }

  /**
   * Create a manual mapping
   */
  createManualMapping(evidenceId: string, elementId: string, reason?: string): EvidenceMapping {
    return {
      evidenceId,
      elementId,
      confidence: 1,
      isManual: true,
      reason: reason || 'Manually mapped by user'
    };
  }

  /**
   * Validate a mapping
   */
  validateMapping(mapping: Partial<EvidenceMapping>): boolean {
    return !!(
      mapping.evidenceId &&
      mapping.evidenceId.trim() !== '' &&
      mapping.elementId &&
      mapping.elementId.trim() !== ''
    );
  }

  /**
   * Analyze mapping quality
   */
  analyzeMappingQuality(mappings: EvidenceMapping[]): MappingAnalysis {
    if (mappings.length === 0) {
      return {
        totalMappings: 0,
        averageConfidence: 0,
        manualMappings: 0,
        autoMappings: 0,
        lowConfidenceMappings: 0,
        highConfidenceMappings: 0
      };
    }

    const totalConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0);
    const manualCount = mappings.filter(m => m.isManual).length;
    const autoCount = mappings.filter(m => !m.isManual).length;
    const lowConfCount = mappings.filter(m => m.confidence < this.confidenceThreshold).length;
    const highConfCount = mappings.filter(m => m.confidence >= 0.9).length;

    return {
      totalMappings: mappings.length,
      averageConfidence: totalConfidence / mappings.length,
      manualMappings: manualCount,
      autoMappings: autoCount,
      lowConfidenceMappings: lowConfCount,
      highConfidenceMappings: highConfCount
    };
  }

  /**
   * Find unmapped elements
   */
  findUnmappedElements(elements: ClaimElement[]): string[] {
    return elements
      .filter(element => !element.supportingEvidence || element.supportingEvidence.length === 0)
      .map(element => element.id);
  }

  /**
   * Find conflicting mappings (same evidence mapped to multiple elements)
   */
  findConflictingMappings(mappings: EvidenceMapping[]): MappingConflict[] {
    const evidenceToElements = new Map<string, string[]>();

    for (const mapping of mappings) {
      if (!evidenceToElements.has(mapping.evidenceId)) {
        evidenceToElements.set(mapping.evidenceId, []);
      }
      evidenceToElements.get(mapping.evidenceId)!.push(mapping.elementId);
    }

    const conflicts: MappingConflict[] = [];
    for (const [evidenceId, elementIds] of evidenceToElements) {
      if (elementIds.length > 1) {
        conflicts.push({ evidenceId, elementIds });
      }
    }

    return conflicts;
  }

  /**
   * Suggest mappings for unmapped evidence
   */
  suggestMappings(evidence: Evidence, elements: ClaimElement[]): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];

    for (const element of elements) {
      const confidence = this.calculateRelevance(evidence, element);
      
      if (confidence > 0.3) { // Lower threshold for suggestions
        const reason = this.generateSuggestionReason(evidence, element, confidence);
        suggestions.push({
          elementId: element.id,
          confidence,
          reason
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 3 suggestions
    return suggestions.slice(0, 3);
  }

  /**
   * Export mappings to JSON
   */
  exportMappings(mappings: EvidenceMapping[]): string {
    return JSON.stringify(mappings, null, 2);
  }

  /**
   * Import mappings from JSON
   */
  importMappings(json: string): EvidenceMapping[] {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.filter(m => this.validateMapping(m));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Calculate relevance between evidence and dispute
   */
  calculateDisputeRelevance(evidence: Evidence, dispute: DisputeFocus): number {
    const evidenceContent = evidence.content.toLowerCase();
    const disputeContent = `${dispute.content} ${dispute.plaintiffView} ${dispute.defendantView} ${dispute.courtView}`.toLowerCase();

    let score = 0;
    let matchCount = 0;

    // Check for keyword matches
    const disputeWords = disputeContent.split(/\s+/).filter(w => w.length > 2);
    const evidenceWords = evidenceContent.split(/\s+/).filter(w => w.length > 2);
    
    for (const word of evidenceWords) {
      if (disputeWords.includes(word)) {
        score += 0.1;
        matchCount++;
      }
    }

    // Special boost for key dispute terms
    if (disputeContent.includes('合同') && evidenceContent.includes('合同')) {
      score += 0.3;
    }
    if (disputeContent.includes('成立') && evidenceContent.includes('签')) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  // Private helper methods
  private generateSuggestionReason(evidence: Evidence, element: ClaimElement, confidence: number): string {
    const reasons: string[] = [];

    if (evidence.type === 'document' && element.name.includes('合同')) {
      reasons.push('文档类型证据可能与合同要素相关');
    }
    if (evidence.type === 'payment' && element.name.includes('支付')) {
      reasons.push('支付类型证据可能与支付要素相关');
    }

    // Check for keyword matches
    const evidenceContent = evidence.content.toLowerCase();
    const elementName = element.name.toLowerCase();
    
    for (const [keyword] of this.keywordWeights) {
      if (evidenceContent.includes(keyword) && elementName.includes(keyword)) {
        reasons.push(`证据和要素都包含关键词"${keyword}"`);
        break;
      }
    }

    if (reasons.length === 0) {
      reasons.push(`基于内容相似度(${Math.round(confidence * 100)}%)的智能匹配建议`);
    }

    return reasons.join('；');
  }
}
import type { Facts, Evidence, Reasoning } from '@/types/legal-case';
import type { ValidationBundle, ValidationResult } from './JudgmentValidators';

interface ConfidenceFactor {
  condition: boolean;
  score: number;
  message: string;
}

export interface ConfidenceReportInput {
  facts: Facts;
  evidence: Evidence;
  reasoning: Reasoning;
  validations: ValidationBundle;
}

export interface ConfidenceDetail {
  module: 'facts' | 'evidence' | 'reasoning';
  score: number;
  factors: string[];
  warnings: string[];
}

export interface ConfidenceReportResult {
  overall: number;
  details: ConfidenceDetail[];
}

export function buildConfidenceReport(input: ConfidenceReportInput): ConfidenceReportResult {
  const factsDetail = calculateFactsConfidence(input.facts, input.validations.facts);
  const evidenceDetail = calculateEvidenceConfidence(input.evidence, input.validations.evidence);
  const reasoningDetail = calculateReasoningConfidence(input.reasoning, input.validations.reasoning);

  const details = [factsDetail, evidenceDetail, reasoningDetail];
  const overall = Math.round(details.reduce((acc, item) => acc + item.score, 0) / details.length);

  return {
    overall,
    details,
  };
}

function calculateFactsConfidence(facts: Facts, validation: ValidationResult): ConfidenceDetail {
  const factors: ConfidenceFactor[] = [
    {
      condition: Boolean(facts.summary && !facts.summary.startsWith('提取失败')),
      score: 30,
      message: '事实摘要完整',
    },
    {
      condition: facts.timeline.length > 0,
      score: 30,
      message: '时间线包含事件',
    },
    {
      condition: facts.keyFacts.length > 0,
      score: 20,
      message: '列出了关键事实',
    },
    {
      condition: validation.warnings.length === 0,
      score: 20,
      message: '事实校验通过',
    },
  ];

  return toConfidenceDetail('facts', factors, validation.warnings);
}

function calculateEvidenceConfidence(evidence: Evidence, validation: ValidationResult): ConfidenceDetail {
  const factors: ConfidenceFactor[] = [
    {
      condition: Boolean(evidence.summary && !evidence.summary.startsWith('提取失败')),
      score: 30,
      message: '证据摘要完整',
    },
    {
      condition: evidence.items.length > 0,
      score: 40,
      message: '证据列表包含条目',
    },
    {
      condition: Boolean(evidence.chainAnalysis?.analysis),
      score: 20,
      message: '证据链分析存在',
    },
    {
      condition: validation.warnings.length === 0,
      score: 10,
      message: '证据校验通过',
    },
  ];

  return toConfidenceDetail('evidence', factors, validation.warnings);
}

function calculateReasoningConfidence(reasoning: Reasoning, validation: ValidationResult): ConfidenceDetail {
  const factors: ConfidenceFactor[] = [
    {
      condition: Boolean(reasoning.summary && !reasoning.summary.startsWith('提取失败')),
      score: 30,
      message: '裁判理由摘要完整',
    },
    {
      condition: reasoning.legalBasis.length > 0,
      score: 30,
      message: '列出了法律依据',
    },
    {
      condition: reasoning.logicChain.length > 0,
      score: 20,
      message: '推理链存在',
    },
    {
      condition: Boolean(reasoning.judgment && !reasoning.judgment.startsWith('提取失败')),
      score: 10,
      message: '裁判主文完整',
    },
    {
      condition: validation.warnings.length === 0,
      score: 10,
      message: '裁判理由校验通过',
    },
  ];

  return toConfidenceDetail('reasoning', factors, validation.warnings);
}

function toConfidenceDetail(
  module: 'facts' | 'evidence' | 'reasoning',
  factors: ConfidenceFactor[],
  warnings: string[],
): ConfidenceDetail {
  let score = 0;
  const passedFactors: string[] = [];

  factors.forEach(({ condition, score: factorScore, message }) => {
    if (condition) {
      score += factorScore;
      passedFactors.push(message);
    }
  });

  if (score > 100) score = 100;

  return {
    module,
    score,
    factors: passedFactors,
    warnings,
  };
}

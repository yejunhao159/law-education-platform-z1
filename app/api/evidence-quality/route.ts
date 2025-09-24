/**
 * 证据质量评估API - AI增强版
 * 整合了智能证据分析、质量评估和学习问题生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { evidenceIntelligenceService } from '@/src/domains/legal-analysis/services/EvidenceIntelligenceService';
import { EvidenceMappingService } from '@/lib/evidence-mapping-service';
import { createLogger } from '@/lib/logging';

const logger = createLogger('EvidenceQualityAPI');
const mappingService = new EvidenceMappingService();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    logger.info('收到证据质量评估请求', {
      evidenceCount: Array.isArray(body.evidence) ? body.evidence.length : 1,
      mode: body.mode || 'auto'
    });

    // 基本参数验证
    if (!body.evidence || !body.claimElements) {
      return NextResponse.json(
        { error: '缺少必需字段: evidence 和 claimElements' },
        { status: 400 }
      );
    }

    const { evidence, claimElements, mode = 'auto', caseContext = {} } = body;

    // 确保evidence是数组格式
    const evidenceArray = Array.isArray(evidence) ? evidence : [evidence];

    let result: any = {
      success: true,
      processingTime: 0,
      timestamp: new Date().toISOString()
    };

    // 根据不同模式执行不同的分析
    switch (mode) {
      case 'ai-assessment': {
        // AI智能证据质量评估
        logger.info('执行AI智能证据质量评估');

        const qualityAssessments = await evidenceIntelligenceService.assessEvidenceQuality(
          evidenceArray,
          caseContext
        );

        result = {
          ...result,
          mode: 'ai-assessment',
          assessments: qualityAssessments,
          summary: {
            totalEvidence: evidenceArray.length,
            averageQuality: qualityAssessments.reduce((sum, a) => sum + a.overallScore, 0) / qualityAssessments.length,
            highQualityCount: qualityAssessments.filter(a => a.overallScore >= 0.8).length,
            lowQualityCount: qualityAssessments.filter(a => a.overallScore < 0.5).length
          }
        };
        break;
      }

      case 'chain-analysis': {
        // 证据链智能分析
        logger.info('执行证据链智能分析');

        const chainAnalyses = await evidenceIntelligenceService.analyzeEvidenceChains(
          evidenceArray,
          claimElements,
          caseContext
        );

        result = {
          ...result,
          mode: 'chain-analysis',
          chains: chainAnalyses,
          summary: {
            totalChains: chainAnalyses.length,
            averageCompleteness: chainAnalyses.reduce((sum, c) => sum + c.completeness, 0) / chainAnalyses.length,
            averageConsistency: chainAnalyses.reduce((sum, c) => sum + c.logicalConsistency, 0) / chainAnalyses.length,
            criticalGapsCount: chainAnalyses.reduce((sum, c) => sum + c.criticalGaps.length, 0)
          }
        };
        break;
      }

      case 'generate-questions': {
        // 生成证据学习问题
        logger.info('生成证据学习问题');

        const config = {
          targetLevel: body.config?.targetLevel || 'intermediate' as const,
          focusAreas: body.config?.focusAreas || ['relevance', 'admissibility'] as const,
          questionTypes: body.config?.questionTypes || ['single-choice', 'multiple-choice'] as const,
          maxQuestions: body.config?.maxQuestions || 5,
          includeExplanations: body.config?.includeExplanations !== false,
          contextClaimElement: body.config?.contextClaimElement
        };

        const questions = await evidenceIntelligenceService.generateEvidenceLearningQuestions(
          evidenceArray,
          claimElements,
          caseContext,
          config
        );

        result = {
          ...result,
          mode: 'generate-questions',
          questions,
          config,
          summary: {
            totalQuestions: questions.length,
            levelDistribution: questions.reduce((dist: any, q) => {
              dist[q.level] = (dist[q.level] || 0) + 1;
              return dist;
            }, {}),
            focusAreaDistribution: questions.reduce((dist: any, q) => {
              dist[q.focusArea] = (dist[q.focusArea] || 0) + 1;
              return dist;
            }, {})
          }
        };
        break;
      }

      case 'comprehensive': {
        // 综合分析（AI评估 + 证据链分析 + 基础映射）
        logger.info('执行综合证据分析');

        const [qualityAssessments, chainAnalyses, basicMappings] = await Promise.all([
          evidenceIntelligenceService.assessEvidenceQuality(evidenceArray, caseContext),
          evidenceIntelligenceService.analyzeEvidenceChains(evidenceArray, claimElements, caseContext),
          Promise.resolve(mappingService.batchAutoMap(evidenceArray, claimElements))
        ]);

        const analysis = mappingService.analyzeMappingQuality(basicMappings);
        const unmappedElements = mappingService.findUnmappedElements(claimElements);
        const conflicts = mappingService.findConflictingMappings(basicMappings);

        result = {
          ...result,
          mode: 'comprehensive',
          qualityAssessments,
          chainAnalyses,
          basicMappings,
          analysis,
          unmappedElements,
          conflicts,
          summary: {
            totalEvidence: evidenceArray.length,
            averageQuality: qualityAssessments.reduce((sum, a) => sum + a.overallScore, 0) / qualityAssessments.length,
            totalChains: chainAnalyses.length,
            averageCompleteness: chainAnalyses.reduce((sum, c) => sum + c.completeness, 0) / chainAnalyses.length,
            mappingQuality: analysis.averageConfidence,
            unmappedCount: unmappedElements.length,
            conflictCount: conflicts.length
          }
        };
        break;
      }

      default: {
        // 传统的自动映射模式（向后兼容）
        logger.info('执行传统自动映射分析');

        let mappings = [];

        if (mode === 'manual') {
          // 创建手动映射
          const { evidenceId, elementId, reason } = body;
          if (!evidenceId || !elementId) {
            return NextResponse.json(
              { error: '手动映射需要 evidenceId 和 elementId' },
              { status: 400 }
            );
          }
          const mapping = mappingService.createManualMapping(evidenceId, elementId, reason);
          mappings = [mapping];
        } else if (mode === 'suggest') {
          // 获取映射建议
          const suggestions = mappingService.suggestMappings(evidenceArray[0], claimElements);
          return NextResponse.json({
            success: true,
            suggestions
          });
        } else {
          // 自动映射
          mappings = mappingService.batchAutoMap(evidenceArray, claimElements);
        }

        const analysis = mappingService.analyzeMappingQuality(mappings);
        const unmappedElements = mappingService.findUnmappedElements(claimElements);
        const conflicts = mappingService.findConflictingMappings(mappings);

        result = {
          ...result,
          mode,
          mappings,
          analysis,
          unmappedElements,
          conflicts
        };
        break;
      }
    }

    result.processingTime = Date.now() - startTime;

    logger.info('证据质量评估完成', {
      mode: result.mode,
      processingTime: result.processingTime
    });

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('证据质量评估失败', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '内部服务器错误',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.mappings) {
      return NextResponse.json(
        { error: 'Missing required field: mappings' },
        { status: 400 }
      );
    }

    // Validate all mappings
    const validMappings = body.mappings.filter((m: any) => 
      mappingService.validateMapping(m)
    );

    if (validMappings.length !== body.mappings.length) {
      return NextResponse.json({
        success: false,
        error: 'Some mappings are invalid',
        validCount: validMappings.length,
        totalCount: body.mappings.length
      }, { status: 400 });
    }

    // Export mappings for storage
    const exported = mappingService.exportMappings(validMappings);

    return NextResponse.json({
      success: true,
      mappings: validMappings,
      exported
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
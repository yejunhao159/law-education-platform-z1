/**
 * 证据质量评估API - AI增强版
 * 整合了智能证据分析、质量评估和学习问题生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { evidenceIntelligenceService } from '@/src/domains/legal-analysis/services/EvidenceIntelligenceService';
import { EvidenceMappingService } from '@/lib/evidence-mapping-service';
import { createLogger } from '@/lib/logging';
import { validateServiceResponse } from '@/src/utils/service-response-validator';

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

    // 验证数据有效性
    if (evidenceArray.length === 0) {
      logger.warn('证据数组为空，无法进行分析');
      return NextResponse.json(
        {
          success: false,
          error: '证据数据为空',
          details: '没有提供有效的证据数据进行分析',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    let result: any = {
      success: false,  // 默认为 false，只有真正成功才设为 true
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

        // 验证AI评估结果
        const assessmentValidation = validateServiceResponse(
          { assessments: qualityAssessments },
          ['assessments'],
          {
            checkForHardcodedValues: true,
            minContentLength: 20,
            requireAIGenerated: true
          }
        );

        if (!assessmentValidation.isValid || qualityAssessments.length === 0) {
          logger.error('AI评估结果验证失败', {
            errors: assessmentValidation.errors,
            warnings: assessmentValidation.warnings
          });
          return NextResponse.json({
            success: false,
            error: '证据质量评估失败',
            details: assessmentValidation.errors.join(', '),
            warnings: assessmentValidation.warnings
          }, { status: 500 });
        }

        result = {
          ...result,
          success: true,  // 只有真正成功才设为 true
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
        // 证据链智能分析 - 已废弃
        logger.warn('证据链分析功能已废弃，根据课堂教学需求简化');

        return NextResponse.json({
          success: false,
          error: '证据链分析功能已废弃',
          details: '根据课堂教学需求，证据链分析过于复杂，已从第二幕教学中移除',
          recommendation: '请使用 comprehensive 或 ai-assessment 模式',
          timestamp: new Date().toISOString()
        }, { status: 410 }); // 410 Gone - 资源已永久移除
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
          success: true,  // 只有真正成功才设为 true
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
        // 综合分析（AI评估 + 基础映射） - 已移除证据链分析
        logger.info('执行综合证据分析（简化版）');

        const [qualityAssessments, basicMappings] = await Promise.all([
          evidenceIntelligenceService.assessEvidenceQuality(evidenceArray, caseContext),
          Promise.resolve(mappingService.batchAutoMap(evidenceArray, claimElements))
        ]);

        const analysis = mappingService.analyzeMappingQuality(basicMappings);
        const unmappedElements = mappingService.findUnmappedElements(claimElements);
        const conflicts = mappingService.findConflictingMappings(basicMappings);

        // 验证综合分析结果
        if (!qualityAssessments || qualityAssessments.length === 0) {
          logger.warn('综合分析失败：质量评估为空');
          return NextResponse.json({
            success: false,
            error: '证据质量评估失败',
            details: '无法生成有效的证据质量评估',
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }

        result = {
          ...result,
          success: true,  // 只有真正成功才设为 true
          mode: 'comprehensive',
          qualityAssessments,
          basicMappings,
          analysis,
          unmappedElements,
          conflicts,
          summary: {
            totalEvidence: evidenceArray.length,
            averageQuality: qualityAssessments.reduce((sum, a) => sum + a.overallScore, 0) / qualityAssessments.length,
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
          success: mappings && mappings.length > 0,  // 根据实际映射结果判断成功
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
      processingTime: result.processingTime,
      success: result.success
    });

    // 根据result.success设置正确的HTTP状态码
    const statusCode = result.success ? 200 : 500;
    return NextResponse.json(result, { status: statusCode });

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
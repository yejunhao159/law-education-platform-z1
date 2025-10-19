/**
 * PPT生成服务（异步流式方案）
 * 负责收集四幕教学数据并调用302.ai API生成PPT
 * DeepPractice Standards Compliant
 *
 * 架构：
 * 1. DeepSeek AI生成大纲（我们的核心能力）
 * 2. 转换为302.ai需要的Markdown格式
 * 3. 调用302.ai异步流式生成PPT（推荐方式）
 * 4. 轮询查询生成进度
 */

import { callUnifiedAI } from '@/src/infrastructure/ai/AICallProxy';
import { useTeachingStore } from '../stores/useTeachingStore';
import { PptContentExtractor, type PptKeyElements } from './PptContentExtractor';
import { PptPromptBuilder } from './prompts/PptPromptBuilder';

// ========== 类型定义 ==========

/**
 * PPT生成结果
 */
export interface PptResult {
  success: boolean;
  url?: string;           // PPT下载链接
  coverUrl?: string;      // 封面图片URL
  pptId?: string;         // PPT ID
  size?: string;          // 文件大小
  slides?: number;        // 页数
  error?: string;         // 错误信息
  tokensUsed?: number;    // AI生成大纲消耗的tokens
  cost?: number;          // 总成本（人民币）
}

/**
 * PPT生成选项
 */
export interface PptGenerationOptions {
  style?: 'formal' | 'modern' | 'academic';  // 内容风格
  language?: 'zh' | 'zh-Hant' | 'en' | 'ja' | 'ko' | 'ar' | 'de' | 'fr' | 'it' | 'pt' | 'es' | 'ru';
  length?: 'short' | 'medium' | 'long';  // 内容长度：10-15页 / 20-25页 / 25-35页
  includeDialogue?: boolean;              // 是否包含苏格拉底对话
  templateId?: string;                    // 302.ai视觉模板ID，不传使用随机模板
  onProgress?: (progress: PptGenerationProgress) => void;  // 进度回调
}

/**
 * PPT生成进度
 */
export interface PptGenerationProgress {
  stage: 'outline' | 'content' | 'rendering' | 'completed';
  progress: number;  // 0-100
  message: string;
  pptId?: string;
}

/**
 * 收集到的教学数据
 */
interface CollectedTeachingData {
  caseInfo: any;
  caseConfidence: number;
  analysisResult: any;
  socraticLevel: number;
  completedNodes: string[];
  learningReport: any;
  hasRealData: boolean;
  // 🎯 新增：真实对话历史（从useSocraticDialogueStore获取）
  conversationHistory?: Array<{
    role: 'ai' | 'user';
    content: string;
    timestamp?: number;
  }>;
  // 🔧 新增：完整的四幕原始数据（供复杂提取使用）
  fullData?: {
    upload: any;
    analysis: any;
    socratic: any;
    summary: any;
  };
}

/**
 * PPT大纲结构（我们的内部格式）
 */
export interface PptOutline {
  slides: Array<{
    title: string;
    content: string;
    type: 'cover' | 'content' | 'image' | 'chart' | 'conclusion';
    visualHints?: string;
  }>;
  metadata: {
    totalSlides: number;
    estimatedMinutes: number;
    targetAudience: string;
  };
}

/**
 * 302.ai异步查询响应（进度查询）
 */
interface AsyncPptInfo {
  code: number;
  message: string;
  data?: {
    total: number;         // 总页数
    current: number;       // 当前生成页数
    pptxProperty?: string; // PPT数据结构
  };
}

/**
 * 302.ai下载PPT响应
 */
interface DownloadPptResponse {
  code: number;
  message: string;
  data?: {
    id: string;
    name: string;
    subject?: string;
    coverUrl: string;
    fileUrl: string;      // PPT下载链接
    templateId?: string;
    updateTime?: string;
    createTime?: string;
  };
}

// ========== PPT生成服务 ==========

export class PptGeneratorService {
  private apiKey?: string;
  private baseUrl = 'https://api.302.ai';
  private readonly requestTimeout = 360000; // 6分钟

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private shouldUseBackendProxy(): boolean {
    return typeof window !== 'undefined' && (!this.apiKey || this.apiKey.length === 0);
  }

  private createAbortController(timeout: number = this.requestTimeout): { controller: AbortController; timer: ReturnType<typeof setTimeout> } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return { controller, timer };
  }

  private async fetchGenerate(requestBody: any): Promise<Response> {
    if (this.shouldUseBackendProxy()) {
      return this.fetchFromBackend('generate', requestBody);
    }

    return this.fetchDirectGenerate(requestBody);
  }

  private async fetchStatus(pptId: string): Promise<AsyncPptInfo> {
    if (this.shouldUseBackendProxy()) {
      return this.fetchJsonFromBackend<AsyncPptInfo>('status', { pptId });
    }

    return this.fetchDirectStatus(pptId);
  }

  private async fetchDownload(pptId: string): Promise<DownloadPptResponse> {
    if (this.shouldUseBackendProxy()) {
      return this.fetchJsonFromBackend<DownloadPptResponse>('download', { pptId });
    }

    return this.fetchDirectDownload(pptId);
  }

  private async fetchFromBackend(action: 'generate', payload: any): Promise<Response> {
    const { controller, timer } = this.createAbortController();

    try {
      const response = await fetch('/api/ppt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PPT服务调用失败 (${response.status}): ${errorText}`);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchJsonFromBackend<T>(action: 'status' | 'download', payload: any): Promise<T> {
    const { controller, timer } = this.createAbortController();

    try {
      const response = await fetch('/api/ppt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, payload }),
        cache: 'no-store',
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`PPT服务调用失败 (${response.status}): ${text}`);
      }

      return text ? (JSON.parse(text) as T) : ({} as T);
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchDirectGenerate(requestBody: any): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('PPT生成服务需要 AI_302_API_KEY');
    }

    const { controller, timer } = this.createAbortController();

    try {
      const response = await fetch(`${this.baseUrl}/302/ppt/generatecontent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`302.ai API调用失败 (${response.status}): ${errorText}`);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchDirectStatus(pptId: string): Promise<AsyncPptInfo> {
    if (!this.apiKey) {
      throw new Error('PPT生成服务需要 AI_302_API_KEY');
    }

    const { controller, timer } = this.createAbortController();

    try {
      const response = await fetch(`${this.baseUrl}/302/ppt/asyncpptinfo?pptId=${pptId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`查询状态失败 (${response.status}): ${text}`);
      }

      return text ? (JSON.parse(text) as AsyncPptInfo) : { code: -1, message: 'Empty response' };
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchDirectDownload(pptId: string): Promise<DownloadPptResponse> {
    if (!this.apiKey) {
      throw new Error('PPT生成服务需要 AI_302_API_KEY');
    }

    const { controller, timer } = this.createAbortController();

    try {
      const response = await fetch(`${this.baseUrl}/302/ppt/downloadpptx`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: pptId,
          refresh: false
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`下载PPT失败 (${response.status}): ${text}`);
      }

      return text ? (JSON.parse(text) as DownloadPptResponse) : { code: -1, message: 'Empty response' };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 生成PPT - 统一入口（异步流式方案）
   */
  async generatePPT(options: PptGenerationOptions): Promise<PptResult> {
    console.log('🚀 [PptGenerator] 开始生成PPT (异步流式)', { options });

    try {
      // 阶段1: 收集数据（< 0.1秒）
      console.log('📊 [PptGenerator] 阶段1: 收集教学数据');
      const data = this.collectData();

      if (!data.hasRealData) {
        console.warn('⚠️ [PptGenerator] 警告: 前三幕数据不完整，PPT质量可能受影响');
      }

      // 阶段2: AI生成大纲（5-8秒）
      console.log('🤖 [PptGenerator] 阶段2: DeepSeek生成PPT大纲');
      options.onProgress?.({
        stage: 'outline',
        progress: 10,
        message: 'AI正在分析教学数据...'
      });

      const outline = await this.generateOutline(data, options);
      console.log('✅ [PptGenerator] 大纲生成完成，共', outline.slides.length, '页');

      options.onProgress?.({
        stage: 'outline',
        progress: 30,
        message: `大纲生成完成（${outline.slides.length}页）`
      });

      // 阶段3: 302.ai异步生成PPT（20-30秒，带真实进度）
      console.log('🎨 [PptGenerator] 阶段3: 302.ai异步渲染PPT');
      const pptResult = await this.generateWithAsyncStream(outline, options);
      console.log('✅ [PptGenerator] PPT生成成功:', pptResult.url);

      return {
        success: true,
        url: pptResult.url,
        coverUrl: pptResult.coverUrl,
        pptId: pptResult.pptId,
        size: pptResult.size,
        slides: outline.slides.length,
        tokensUsed: pptResult.tokensUsed,
        cost: pptResult.cost
      };

    } catch (error) {
      console.error('❌ [PptGenerator] PPT生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成PPT失败，请重试'
      };
    }
  }

  /**
   * 仅生成大纲（供UI预览和编辑）
   */
  async generateOutlineOnly(options: PptGenerationOptions): Promise<PptOutline> {
    const data = this.collectData();
    return await this.generateOutline(data, options);
  }

  /**
   * 使用已编辑的大纲生成PPT
   */
  async generateFromOutline(
    outline: PptOutline,
    options: PptGenerationOptions
  ): Promise<PptResult> {
    console.log('🚀 [PptGenerator] 使用已编辑大纲生成PPT');

    try {
      const pptResult = await this.generateWithAsyncStream(outline, options);

      return {
        success: true,
        url: pptResult.url,
        coverUrl: pptResult.coverUrl,
        pptId: pptResult.pptId,
        size: pptResult.size,
        slides: outline.slides.length,
        tokensUsed: pptResult.tokensUsed,
        cost: pptResult.cost
      };

    } catch (error) {
      console.error('❌ [PptGenerator] PPT生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成PPT失败，请重试'
      };
    }
  }

  /**
   * 收集教学数据（增强版：包含完整的四幕数据 + 真实对话历史）
   * 公开此方法供外部调用
   */
  public collectData(): CollectedTeachingData {
    const store = useTeachingStore.getState();

    // 🔧 修复：提取第一幕的真实案例数据
    const extractedData = store.uploadData?.extractedElements as any;
    const actualCaseInfo = extractedData?.data || extractedData || {};

    // 🎯 关键修复：获取真实的苏格拉底对话历史
    let conversationHistory: Array<{ role: 'ai' | 'user'; content: string; timestamp?: number }> = [];
    if (typeof window !== 'undefined') {
      try {
        // 动态导入useSocraticDialogueStore以避免循环依赖
        const { useSocraticDialogueStore } = require('@/src/domains/socratic-dialogue/stores/useSocraticDialogueStore');
        const socraticStore = useSocraticDialogueStore.getState();

        // 转换消息格式为统一的对话历史格式
        conversationHistory = socraticStore.messages.map((msg: any) => ({
          role: msg.role === 'agent' ? 'ai' : 'user',
          content: msg.content,
          timestamp: msg.timestamp
        }));

        console.log('📨 [PptGenerator] 成功获取苏格拉底对话历史:', {
          messageCount: conversationHistory.length,
          hasRealDialogue: conversationHistory.length > 0
        });
      } catch (error) {
        console.warn('⚠️ [PptGenerator] 无法获取对话历史:', error);
      }
    }

    const data: CollectedTeachingData = {
      caseInfo: actualCaseInfo,
      caseConfidence: store.uploadData.confidence || 0,
      analysisResult: store.analysisData.result || {},
      socraticLevel: store.socraticData.level || 0,
      completedNodes: Array.from(store.socraticData.completedNodes || []),
      learningReport: store.summaryData.caseLearningReport || {},
      hasRealData: false,
      // 🎯 新增：真实对话历史
      conversationHistory,
      // 🔧 新增：完整的四幕数据（备用）
      fullData: {
        upload: store.uploadData,
        analysis: store.analysisData,
        socratic: store.socraticData,
        summary: store.summaryData
      }
    };

    const hasCaseInfo = Object.keys(data.caseInfo).length > 0;
    const hasAnalysis = Object.keys(data.analysisResult).length > 0;
    const hasReport = Object.keys(data.learningReport).length > 0;
    const hasDialogue = conversationHistory.length > 0;

    data.hasRealData = hasCaseInfo || hasAnalysis || hasReport;

    console.log('📊 [PptGenerator] 数据收集完成（增强版）:', {
      caseInfo: hasCaseInfo ? `✅ (${Object.keys(data.caseInfo).length}字段)` : '❌',
      caseInfoKeys: hasCaseInfo ? Object.keys(data.caseInfo).slice(0, 5) : [],
      analysisResult: hasAnalysis ? `✅ (${Object.keys(data.analysisResult).length}字段)` : '❌',
      analysisKeys: hasAnalysis ? Object.keys(data.analysisResult).slice(0, 5) : [],
      socraticLevel: data.socraticLevel,
      completedNodes: data.completedNodes.length,
      learningReport: hasReport ? '✅' : '❌',
      conversationHistory: hasDialogue ? `✅ (${conversationHistory.length}条消息)` : '❌',
      hasRealData: data.hasRealData
    });

    return data;
  }

  /**
   * AI生成PPT大纲（流式输出版本 - 直接生成Markdown）
   * 公开此方法供UI层使用
   *
   * 🔧 重构说明：直接生成Markdown，不再使用JSON中间格式
   * - 优势1: 更简单的流程（DeepSeek → Markdown → 302.ai）
   * - 优势2: 更好的流式体验（用户看到可读的Markdown而非JSON）
   * - 优势3: 消除JSON解析错误点
   * - 优势4: 减少转换逻辑
   */
  public async generateOutlineStream(
    data: CollectedTeachingData,
    options: PptGenerationOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // ✅ 使用专业的Prompt构建器
    const promptBuilder = new PptPromptBuilder();

    // 提取PPT关键要素
    const extractor = new PptContentExtractor();
    const keyElements = extractor.extract(data);

    // 构建System Prompt（标准的法学案例教学课件）
    const systemPrompt = promptBuilder.buildSystemPrompt();

    // 构建User Prompt
    const userPrompt = promptBuilder.buildUserPrompt({
      style: options.style,
      length: options.length,
      includeDialogue: options.includeDialogue,
      keyElements,
      studyDuration: data.caseInfo?.studyDuration
    });

    // 🔧 根据PPT长度动态计算maxTokens（防止大纲被截断）
    // ⚠️ DeepSeek API max_tokens最大值为8192，需要在此范围内
    const maxTokensMap = {
      short: 4000,   // 10-15页 → 约50%容量，确保完整性
      medium: 6000,  // 20-25页 → 约75%容量，支持更详细的内容
      long: 8000     // 25-35页 → 约98%容量，充分利用API限制
    };
    const maxTokens = maxTokensMap[options.length || 'medium'];

    console.log('🔍 [PptGenerator] AI大纲流式生成（Markdown模式）- Prompt长度:', {
      system: systemPrompt.length,
      user: userPrompt.length,
      total: systemPrompt.length + userPrompt.length,
      expectedLength: options.length || 'medium',
      maxTokens: maxTokens,
      outputFormat: 'Markdown (直接生成)'
    });

    try {
      // 动态导入流式API
      const { callUnifiedAIStream } = await import('@/src/infrastructure/ai/AICallProxy');

      let fullContent = '';

      // 🚀 真正的流式输出 - 生成Markdown文本
      const stream = await callUnifiedAIStream(systemPrompt, userPrompt, {
        temperature: 0.5,
        maxTokens: maxTokens,  // 🔧 关键修复：根据长度动态调整，防止截断
        responseFormat: 'text',  // 🎯 关键变更：从'json'改为'text'，直接生成Markdown
        onChunk: (chunk: string) => {
          fullContent += chunk;
          // 实时回调给UI，用户能看到可读的Markdown而非JSON
          if (onChunk) {
            onChunk(chunk);
          }
        }
      });

      // 消费流
      for await (const chunk of stream) {
        // 流已经通过onChunk回调处理了
      }

      console.log('🔍 [PptGenerator] Markdown流式输出完成，收到的完整内容长度:', fullContent.length);
      console.log('📝 [PptGenerator] 前200字符预览:\n', fullContent.substring(0, 200));
      console.log('📝 [PptGenerator] 后200字符预览:\n', fullContent.substring(Math.max(0, fullContent.length - 200)));

      // 🎯 关键简化：直接返回Markdown，无需JSON解析和验证
      const markdownContent = fullContent.trim();

      // 基本验证：确保有内容且包含标题标记
      if (!markdownContent || markdownContent.length < 100) {
        throw new Error('生成的Markdown内容过短或为空');
      }

      if (!markdownContent.includes('##')) {
        console.warn('⚠️ [PptGenerator] 生成的内容不包含页面标题标记(##)，可能格式不正确');
      }

      console.log('✅ [PptGenerator] Markdown大纲生成完成:', {
        contentLength: markdownContent.length,
        estimatedPages: (markdownContent.match(/##/g) || []).length,
        hasDesignHints: markdownContent.includes('💡 设计提示')
      });

      return markdownContent;

    } catch (error) {
      console.error('❌ [PptGenerator] AI大纲流式生成失败:', error);
      throw new Error(`AI大纲生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * AI生成PPT大纲（非流式版本，保持向后兼容）
   */
  private async generateOutline(
    data: CollectedTeachingData,
    options: PptGenerationOptions
  ): Promise<PptOutline> {
    // ✅ 使用专业的Prompt构建器
    const promptBuilder = new PptPromptBuilder();

    // 提取PPT关键要素
    const extractor = new PptContentExtractor();
    const keyElements = extractor.extract(data);

    // 构建System Prompt（标准的法学案例教学课件）
    const systemPrompt = promptBuilder.buildSystemPrompt();

    // 构建User Prompt
    const userPrompt = promptBuilder.buildUserPrompt({
      style: options.style,
      length: options.length,
      includeDialogue: options.includeDialogue,
      keyElements,
      studyDuration: data.caseInfo?.studyDuration
    });

    // 🔧 根据PPT长度动态计算maxTokens（防止大纲被截断）
    // ⚠️ DeepSeek API max_tokens最大值为8192，需要在此范围内
    const maxTokensMap = {
      short: 4000,   // 10-15页 → 约50%容量，确保完整性
      medium: 6000,  // 20-25页 → 约75%容量，支持更详细的内容
      long: 8000     // 25-35页 → 约98%容量，充分利用API限制
    };
    const maxTokens = maxTokensMap[options.length || 'medium'];

    console.log('🔍 [PptGenerator] AI大纲生成 - Prompt长度:', {
      system: systemPrompt.length,
      user: userPrompt.length,
      total: systemPrompt.length + userPrompt.length,
      expectedLength: options.length || 'medium',
      maxTokens: maxTokens
    });

    // 🐛 调试日志: 查看完整Prompt内容
    console.log('━━━━━━━━━━ SYSTEM PROMPT ━━━━━━━━━━');
    console.log(systemPrompt);
    console.log('━━━━━━━━━━ USER PROMPT ━━━━━━━━━━');
    console.log(userPrompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const result = await callUnifiedAI(systemPrompt, userPrompt, {
        temperature: 0.5,
        maxTokens: maxTokens,  // 🔧 关键修复：根据长度动态调整，防止截断
        responseFormat: 'json'
      });

      let content = (result as any).content || result;

      if (typeof content === 'string') {
        content = content.trim();
        content = content.replace(/^```(?:json)?\s*\n?/i, '');
        content = content.replace(/\n?```\s*$/i, '');
        content = content.trim();
      }

      const outline = typeof content === 'string' ? JSON.parse(content) : content;

      console.log('✅ [PptGenerator] 大纲生成成功:', {
        slides: outline.slides?.length || 0,
        tokensUsed: (result as any).tokensUsed,
        cost: (result as any).cost
      });

      // 🐛 调试：打印生成的大纲详情
      console.log('━━━━━━━━━━ 生成的PPT大纲 ━━━━━━━━━━');
      console.log('总页数:', outline.slides?.length);
      if (outline.slides && outline.slides.length > 0) {
        console.log('\n前3页预览:');
        outline.slides.slice(0, 3).forEach((slide: any, i: number) => {
          console.log(`\n第${i+1}页:`, {
            title: slide.title,
            type: slide.type,
            contentPreview: slide.content?.substring(0, 100) + '...',
            hasVisualHints: !!slide.visualHints
          });
        });
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return this.validateOutline(outline);

    } catch (error) {
      console.error('❌ [PptGenerator] AI大纲生成失败:', error);
      throw new Error(`AI大纲生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 302.ai异步流式生成PPT（推荐方式）
   */
  private async generateWithAsyncStream(
    outline: PptOutline,
    options: PptGenerationOptions
  ): Promise<{ url: string; coverUrl?: string; pptId?: string; size?: string; tokensUsed?: number; cost?: number }> {
    // 1. 将大纲转换为302.ai需要的Markdown格式
    const outlineMarkdown = this.outlineToMarkdown(outline);

    console.log('📤 [PptGenerator] 302.ai异步流式生成', {
      markdownLength: outlineMarkdown.length,
      language: options.language || 'zh',
      length: options.length || 'medium'
    });

    options.onProgress?.({
      stage: 'content',
      progress: 40,
      message: '开始生成PPT内容...'
    });

    // 2. 调用302.ai generatecontent接口（异步模式）
    const requestBody = {
      outlineMarkdown: outlineMarkdown,
      stream: true,
      asyncGenPptx: true,  // 🔑 关键：开启异步生成PPT
      lang: options.language || 'zh',
      templateId: options.templateId
      // 注：大纲本身已经包含了所有设计要求，不需要额外的prompt
    };

    try {
      const response = await this.fetchGenerate(requestBody);

      // 3. 处理流式响应，获取pptId
      const pptId = await this.handleStreamResponse(response, options);

      if (!pptId) {
        throw new Error('未能从流式响应中获取pptId');
      }

      console.log('✅ [PptGenerator] 获取到pptId:', pptId);

      options.onProgress?.({
        stage: 'rendering',
        progress: 60,
        message: 'PPT渲染中...',
        pptId
      });

      // 4. 轮询查询PPT生成状态
      await this.pollPptStatus(pptId, options);

      // 5. PPT生成完成后，调用下载接口获取fileUrl
      console.log('📥 [PptGenerator] PPT渲染完成，正在获取下载链接...');
      const pptInfo = await this.downloadPpt(pptId);

      if (!pptInfo) {
        throw new Error('下载PPT失败：未能获取PPT信息');
      }

      options.onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'PPT生成完成！'
      });

      return {
        url: pptInfo.fileUrl,
        coverUrl: pptInfo.coverUrl,
        pptId: pptInfo.id,
        size: undefined, // 302.ai不返回size
        tokensUsed: undefined,
        cost: 0.07 // 固定成本 0.07 PTC/次
      };

    } catch (error) {
      console.error('❌ [PptGenerator] 302.ai异步生成失败:', error);
      throw new Error(`302.ai生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理流式响应，提取pptId
   */
  private async handleStreamResponse(
    response: Response,
    options: PptGenerationOptions
  ): Promise<string | null> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('无法读取响应流');
    }

    let pptId: string | null = null;
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          try {
            // 解析SSE格式: data: {...}
            const dataMatch = line.match(/^data: (.+)$/);
            if (dataMatch && dataMatch[1]) {
              const data = JSON.parse(dataMatch[1]);

              console.log('📥 [PptGenerator] 流式数据:', data);

              // 检查是否包含pptId
              if (data.pptId) {
                pptId = data.pptId;
                console.log('✅ [PptGenerator] 提取到pptId:', pptId);
              }

              // 更新进度
              if (data.status === 3) {
                // 生成中
                options.onProgress?.({
                  stage: 'content',
                  progress: 50,
                  message: data.text || '生成内容中...'
                });
              } else if (data.status === 4) {
                // 完成
                if (data.result?.pptId) {
                  pptId = data.result.pptId;
                }
              } else if (data.status === -1) {
                // 错误
                throw new Error(data.error || '流式生成失败');
              }
            }
          } catch (parseError) {
            console.warn('解析流式数据失败:', line, parseError);
          }
        }
      }

      return pptId;

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 轮询查询PPT生成状态
   * 注意：此接口只返回生成进度(current/total)，不返回fileUrl
   * fileUrl需要通过downloadPpt接口获取
   */
  private async pollPptStatus(
    pptId: string,
    options: PptGenerationOptions,
    maxAttempts: number = 90,  // 最多轮询90次（3分钟）
    interval: number = 2000     // 每2秒查询一次
  ): Promise<void> {
    console.log('🔄 [PptGenerator] 开始轮询PPT生成状态, pptId:', pptId);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.fetchStatus(pptId);

        const current = result.data?.current || 0;
        const total = result.data?.total || 0;

        console.log(`📊 [PptGenerator] 轮询 ${attempt}/${maxAttempts}:`, {
          code: result.code,
          message: result.message,
          current,
          total,
          hasData: !!result.data
        });

        // 如果data为null，可能是30秒缓存已过期，或PPT已完成
        // 如果current >= total，说明PPT已生成完成
        if (result.data && current >= total && total > 0) {
          console.log('✅ [PptGenerator] PPT渲染完成！');
          return; // 成功完成
        }

        // 更新进度
        if (result.data && total > 0) {
          const baseProgress = 60;
          const renderProgress = (current / total) * 35; // 渲染阶段占35%
          options.onProgress?.({
            stage: 'rendering',
            progress: Math.round(baseProgress + renderProgress),
            message: `渲染中 ${current}/${total} 页...`,
            pptId
          });
        }

        // 等待后继续轮询
        await new Promise(resolve => setTimeout(resolve, interval));

      } catch (error) {
        console.error(`❌ [PptGenerator] 轮询失败 (${attempt}/${maxAttempts}):`, error);

        if (attempt === maxAttempts) {
          throw new Error('PPT生成超时，请稍后重试');
        }

        // 继续尝试
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('PPT生成超时，请稍后重试');
  }

  /**
   * 下载PPT，获取最终的fileUrl
   */
  private async downloadPpt(pptId: string): Promise<DownloadPptResponse['data']> {
    console.log('📥 [PptGenerator] 调用下载接口获取PPT文件链接, pptId:', pptId);

    try {
      const result = await this.fetchDownload(pptId);

      if (result.code !== 0 || !result.data?.fileUrl) {
        throw new Error(result.message || '未能获取PPT下载链接');
      }

      console.log('✅ [PptGenerator] 成功获取PPT下载链接:', {
        id: result.data.id,
        name: result.data.name,
        fileUrl: result.data.fileUrl,
        coverUrl: result.data.coverUrl
      });

      return result.data;

    } catch (error) {
      console.error('❌ [PptGenerator] 下载PPT失败:', error);
      throw new Error(`下载PPT失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }


  /**
   * 验证并补全大纲结构
   */
  private validateOutline(outline: any): PptOutline {
    if (!outline.slides || !Array.isArray(outline.slides)) {
      throw new Error('大纲格式错误：缺少 slides 数组');
    }

    const metadata = outline.metadata || {};
    metadata.totalSlides = outline.slides.length;
    metadata.estimatedMinutes = metadata.estimatedMinutes || Math.ceil(outline.slides.length * 1.5);
    metadata.targetAudience = metadata.targetAudience || '未指定';

    return {
      slides: outline.slides,
      metadata
    };
  }

  /**
   * 直接从Markdown文本生成PPT（新方法，用于独立页面）
   */
  async generateFromMarkdown(
    markdownText: string,
    options: {
      templateId?: string;
      language?: string;
      onProgress?: (progress: PptGenerationProgress) => void;
    }
  ): Promise<PptResult> {
    console.log('🚀 [PptGenerator] 从Markdown生成PPT');

    try {
      options.onProgress?.({
        stage: 'content',
        progress: 40,
        message: '开始生成PPT内容...'
      });

      // 调用302.ai generatecontent接口
      const requestBody = {
        outlineMarkdown: markdownText,
        stream: true,
        asyncGenPptx: true,
        lang: options.language || 'zh',
        templateId: options.templateId
      };

      const response = await this.fetchGenerate(requestBody);

      // 处理流式响应，获取pptId
      const pptId = await this.handleStreamResponse(response, {
        onProgress: options.onProgress
      });

      if (!pptId) {
        throw new Error('未能从流式响应中获取pptId');
      }

      console.log('✅ [PptGenerator] 获取到pptId:', pptId);

      options.onProgress?.({
        stage: 'rendering',
        progress: 60,
        message: 'PPT渲染中...',
        pptId
      });

      // 轮询查询PPT生成状态
      await this.pollPptStatus(pptId, {
        onProgress: options.onProgress
      });

      // 获取下载链接
      console.log('📥 [PptGenerator] PPT渲染完成，正在获取下载链接...');
      const pptInfo = await this.downloadPpt(pptId);

      if (!pptInfo) {
        throw new Error('下载PPT失败：未能获取PPT信息');
      }

      options.onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'PPT生成完成！'
      });

      return {
        success: true,
        url: pptInfo.fileUrl,
        coverUrl: pptInfo.coverUrl,
        pptId: pptInfo.id,
        cost: 0.07
      };

    } catch (error) {
      console.error('❌ [PptGenerator] PPT生成失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成PPT失败，请重试'
      };
    }
  }

  /**
   * 将大纲转换为Markdown格式（302.ai API需要）
   * 公开此方法供UI层使用
   */
  public outlineToMarkdown(outline: PptOutline): string {
    let markdown = `# ${outline.metadata.targetAudience}专用PPT\n\n`;

    outline.slides.forEach((slide, index) => {
      // 使用二级标题表示每一页
      markdown += `## ${slide.title}\n\n`;

      // 内容（保持原格式）
      markdown += `${slide.content}\n\n`;

      // 如果有可视化提示，添加为引用
      if (slide.visualHints) {
        markdown += `> 💡 设计提示：${slide.visualHints}\n\n`;
      }

      // 页面分隔
      if (index < outline.slides.length - 1) {
        markdown += '---\n\n';
      }
    });

    // 添加元信息
    markdown += `\n---\n\n`;
    markdown += `**元信息**\n`;
    markdown += `- 总页数：${outline.metadata.totalSlides}\n`;
    markdown += `- 预估时长：${outline.metadata.estimatedMinutes}分钟\n`;
    markdown += `- 目标受众：${outline.metadata.targetAudience}\n`;

    return markdown;
  }
}

// ========== 默认导出 ==========
export default PptGeneratorService;

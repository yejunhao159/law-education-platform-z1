'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, AlertCircle, Scale, Brain, Clock, Sparkles, Loader2 } from 'lucide-react';
import { LegalParser, type LegalDocument } from '@/lib/legal-parser';
import { Badge } from '@/components/ui/badge';
import { DocFormatGuide } from './DocFormatGuide';

interface ParsedDocument {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    caseNumber?: string;
    parties?: string;
    court?: string;
    date?: string;
  };
  legalAnalysis?: LegalDocument;
}

interface FileUploaderProps {
  onFileProcessed?: (document: ParsedDocument) => void;
}

export function FileUploader({ onFileProcessed }: FileUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedContent, setParsedContent] = useState<ParsedDocument | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [mammoth, setMammoth] = useState<any>(null);
  const [useAI, setUseAI] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // 动态导入库，避免SSR问题
  useEffect(() => {
    let mounted = true;
    
    const loadLibraries = async () => {
      if (typeof window !== 'undefined' && mounted) {
        try {
          console.log('开始加载文档解析库...');
          
          // 同步加载所有库
          const [pdfjs, mammothLib] = await Promise.all([
            import('pdfjs-dist').catch(err => {
              console.warn('PDF库加载失败:', err);
              return null;
            }),
            import('mammoth').catch(err => {
              console.warn('DOCX库加载失败:', err);
              return null;
            })
          ]);
          
          if (!mounted) return;
          
          if (pdfjs) {
            console.log('PDF库加载成功');
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
            setPdfjsLib(pdfjs);
          }
          
          if (mammothLib) {
            console.log('DOCX库加载成功');
            setMammoth(mammothLib);
          }
          
          // 标记库已加载完成
          setLibrariesLoaded(true);
          console.log('所有文档解析库加载完成');
          
        } catch (err) {
          console.error('库加载失败:', err);
          if (mounted) {
            setLibrariesLoaded(true); // 允许继续使用 MD/TXT
          }
        }
      }
    };
    
    // 立即执行加载
    loadLibraries();
    
    return () => {
      mounted = false;
    };
  }, []);

  // PDF解析函数
  const parsePDF = async (file: File): Promise<string> => {
    if (!pdfjsLib) {
      throw new Error('PDF库还未加载完成');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    const totalPages = pdf.numPages;
    for (let i = 1; i <= totalPages; i++) {
      setProgress((i / totalPages) * 100);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\\n';
    }
    
    return fullText;
  };

  // DOCX解析函数
  const parseDOCX = async (file: File): Promise<string> => {
    if (!mammoth) {
      throw new Error('DOCX库还未加载完成');
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // 检查是否为有效的 ZIP/DOCX 文件（DOCX 文件头应该是 PK）
      const uint8Array = new Uint8Array(arrayBuffer);
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
        throw new Error('文件格式错误：这不是有效的 DOCX 文件。请确保上传的是 .docx 格式（不支持旧版 .doc 格式）');
      }
      
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('无法从 DOCX 文件中提取文本内容');
      }
      
      return result.value;
    } catch (error: any) {
      // 提供更友好的错误信息
      if (error.message?.includes("Can't find end of central directory")) {
        throw new Error('文件格式错误：请确保上传的是标准的 .docx 文件（不支持 .doc 或其他格式）');
      }
      throw error;
    }
  };

  // Markdown解析函数
  const parseMD = async (file: File): Promise<string> => {
    return await file.text();
  };

  // 提取关键信息
  const extractKeyInfo = (text: string) => {
    const caseNumberMatch = text.match(/[(（]\\d{4}[）)].*?第?\\d+号/);
    const courtMatch = text.match(/[\u4e00-\u9fa5]+人民法院/);
    const dateMatch = text.match(/\\d{4}年\\d{1,2}月\\d{1,2}日/);
    
    // 提取当事人（简化版）
    let parties = '';
    const plaintiffMatch = text.match(/原告[：:]?([\\u4e00-\\u9fa5]+)/);
    const defendantMatch = text.match(/被告[：:]?([\\u4e00-\\u9fa5]+)/);
    if (plaintiffMatch && defendantMatch) {
      parties = `${plaintiffMatch[1]} 诉 ${defendantMatch[1]}`;
    }
    
    return {
      caseNumber: caseNumberMatch?.[0] || undefined,
      court: courtMatch?.[0] || undefined,
      date: dateMatch?.[0] || undefined,
      parties: parties || undefined,
    };
  };

  // 处理文件
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    // 检查文件类型，如果是 MD/TXT 不需要等待库加载
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'md' && fileType !== 'txt' && !librariesLoaded) {
      // 等待库加载完成
      console.log('等待文档解析库加载...');
      let waitCount = 0;
      while (!librariesLoaded && waitCount < 50) { // 最多等待5秒
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (!librariesLoaded && fileType !== 'md' && fileType !== 'txt') {
        setError('文档解析库加载超时，请刷新页面重试');
        setIsProcessing(false);
        return;
      }
    }
    
    try {
      let text = '';
      
      switch (fileType) {
        case 'pdf':
          if (!pdfjsLib) {
            throw new Error('PDF解析库未能正确加载');
          }
          text = await parsePDF(file);
          break;
        case 'docx':
          if (!mammoth) {
            throw new Error('DOCX解析库未能正确加载');
          }
          text = await parseDOCX(file);
          break;
        case 'doc':
          throw new Error('不支持旧版 .doc 格式，请将文件另存为 .docx 格式后重新上传');
        case 'md':
        case 'txt':
          text = await parseMD(file);  // MD 和 TXT 使用相同的解析方法
          break;
        default:
          throw new Error('不支持的文件格式');
      }
      
      // 使用智能解析器提取法律文书信息
      const legalDoc = LegalParser.parse(text);
      
      const basicParsedContent = {
        text,
        metadata: {
          fileName: file.name,
          fileType: fileType || 'unknown',
          caseNumber: legalDoc.caseNumber,
          court: legalDoc.court,
          date: legalDoc.date,
          parties: legalDoc.parties ? 
            `${legalDoc.parties.plaintiff || '原告'} 诉 ${legalDoc.parties.defendant || '被告'}` : 
            undefined,
        },
        legalAnalysis: legalDoc,
      };
      
      setParsedContent(basicParsedContent);
      setProgress(100);
      
      // 如果启用AI，进行深度分析
      if (useAI) {
        setAiProcessing(true);
        try {
          console.log('开始AI分析...');
          const response = await fetch('/api/extract-elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, useAI: true })
          });
          
          console.log('AI API响应状态:', response.status);
          
          if (response.ok) {
            const aiData = await response.json();
            console.log('AI分析结果:', aiData);
            setAiResult(aiData.data);
          } else {
            const errorData = await response.json();
            console.error('AI API错误响应:', errorData);
          }
        } catch (aiError) {
          console.warn('AI分析失败，使用规则引擎结果:', aiError);
        } finally {
          setAiProcessing(false);
        }
      }
    } catch (err) {
      // 提供更详细的错误信息
      let errorMessage = '文件解析失败';
      if (err instanceof Error) {
        errorMessage = err.message;
        // 针对特定错误提供更友好的提示
        if (err.message.includes('DOCX')) {
          errorMessage = '文档格式错误：请确保上传的是标准的 .docx 文件（Word 2007及以上版本）';
        } else if (err.message.includes('PDF')) {
          errorMessage = 'PDF解析失败：文件可能已损坏或加密';
        }
      }
      setError(errorMessage);
      console.error('解析错误详情:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Dropzone配置
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const reset = () => {
    setUploadedFile(null);
    setParsedContent(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* .doc 格式引导 */}
      {!uploadedFile && <DocFormatGuide />}
      
      {/* 上传区域 */}
      {!uploadedFile && (
        <Card
          {...getRootProps()}
          className={`border-2 border-dashed p-12 text-center transition-all ${
            !librariesLoaded 
              ? 'border-gray-200 bg-gray-50 cursor-wait' 
              : isDragActive 
                ? 'border-blue-500 bg-blue-50 cursor-pointer' 
                : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }`}
        >
          <input {...getInputProps()} disabled={!librariesLoaded} />
          {!librariesLoaded ? (
            <>
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">正在加载文档解析库...</h3>
              <p className="text-gray-500">请稍候</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {isDragActive ? '松开以上传文件' : '拖拽或点击上传判决书'}
              </h3>
              <p className="text-gray-500 mb-2">支持 PDF、DOCX（Word 2007+）、MD、TXT 格式</p>
              <p className="text-sm text-gray-400">文件大小限制：10MB</p>
            </>
          )}
        </Card>
      )}

      {/* 处理中状态 */}
      {isProcessing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700">正在解析文件...</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {/* 错误提示 */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              重新上传
            </Button>
          </div>
        </Card>
      )}

      {/* 解析结果 */}
      {parsedContent && !isProcessing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-800">{parsedContent.metadata.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    文件已成功解析
                    {aiProcessing && " • AI深度分析中..."}
                    {aiResult && " • AI分析完成"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    className="rounded"
                  />
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI增强
                  </span>
                </label>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 提取的关键信息 */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="font-semibold text-gray-700 mb-3">提取的关键信息</h5>
              {parsedContent.metadata.caseNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">案号：</span>
                  <span className="text-sm font-medium">{parsedContent.metadata.caseNumber}</span>
                </div>
              )}
              {parsedContent.metadata.parties && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">当事人：</span>
                  <span className="text-sm font-medium">{parsedContent.metadata.parties}</span>
                </div>
              )}
              {parsedContent.metadata.court && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">法院：</span>
                  <span className="text-sm font-medium">{parsedContent.metadata.court}</span>
                </div>
              )}
              {parsedContent.metadata.date && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">判决日期：</span>
                  <span className="text-sm font-medium">{parsedContent.metadata.date}</span>
                </div>
              )}
            </div>

            {/* AI深度分析结果 */}
            {aiProcessing && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <div>
                    <h5 className="font-semibold text-gray-700">AI深度分析中...</h5>
                    <p className="text-xs text-gray-600">正在使用AI智能体深度理解判决书内容</p>
                  </div>
                </div>
              </div>
            )}
            
            {aiResult && aiResult.threeElements && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 space-y-3 border border-purple-200">
                <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                  AI深度三要素分析
                  <Badge variant="secondary" className="ml-2 text-xs">
                    置信度: {aiResult.metadata?.confidence || 85}%
                  </Badge>
                </h5>
                
                {/* AI提取的事实 */}
                {aiResult.threeElements.facts && (
                  <div className="bg-white/80 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">案件事实（AI增强）</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {aiResult.threeElements.facts.summary || '正在分析...'}
                    </p>
                    {aiResult.threeElements.facts.keyFacts && (
                      <div className="flex flex-wrap gap-1">
                        {aiResult.threeElements.facts.keyFacts.slice(0, 3).map((fact: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {fact}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* AI提取的证据 */}
                {aiResult.threeElements.evidence && (
                  <div className="bg-white/80 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">证据质证（AI增强）</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {aiResult.threeElements.evidence.summary || '正在分析...'}
                    </p>
                    {aiResult.threeElements.evidence.chainAnalysis && (
                      <div className="flex items-center gap-2 text-xs">
                        <span>证据链强度:</span>
                        <Badge variant={
                          aiResult.threeElements.evidence.chainAnalysis.strength === 'strong' ? 'default' :
                          aiResult.threeElements.evidence.chainAnalysis.strength === 'moderate' ? 'secondary' :
                          'outline'
                        }>
                          {aiResult.threeElements.evidence.chainAnalysis.strength === 'strong' ? '强' :
                           aiResult.threeElements.evidence.chainAnalysis.strength === 'moderate' ? '中' : '弱'}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                {/* AI提取的裁判理由 */}
                {aiResult.threeElements.reasoning && (
                  <div className="bg-white/80 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">法官说理（AI增强）</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {aiResult.threeElements.reasoning.summary || '正在分析...'}
                    </p>
                    {aiResult.threeElements.reasoning.keyArguments && (
                      <div className="space-y-1">
                        {aiResult.threeElements.reasoning.keyArguments.slice(0, 2).map((arg: string, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                            <span>•</span>
                            <span>{arg}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 三要素智能分析（规则引擎） */}
            {!aiResult && parsedContent.legalAnalysis && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h5 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <Brain className="w-4 h-4 mr-2 text-blue-600" />
                  三要素分析（规则引擎）
                </h5>
                
                {/* 案件事实 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">案件事实</span>
                  </div>
                  <p className="text-xs text-gray-600 pl-6">
                    {parsedContent.legalAnalysis.threeElements.facts.content.substring(0, 100)}...
                  </p>
                  {parsedContent.legalAnalysis.threeElements.facts.keywords.length > 0 && (
                    <div className="pl-6 flex flex-wrap gap-1">
                      {parsedContent.legalAnalysis.threeElements.facts.keywords.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="text-xs bg-white px-2 py-0.5 rounded text-gray-600">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 法律依据 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">法律依据</span>
                  </div>
                  {parsedContent.legalAnalysis.threeElements.law.provisions && 
                   parsedContent.legalAnalysis.threeElements.law.provisions.length > 0 && (
                    <p className="text-xs text-gray-600 pl-6">
                      {parsedContent.legalAnalysis.threeElements.law.provisions[0]}
                    </p>
                  )}
                </div>
                
                {/* 裁判理由 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">裁判理由</span>
                  </div>
                  <p className="text-xs text-gray-600 pl-6">
                    {parsedContent.legalAnalysis.threeElements.reasoning.content.substring(0, 100)}...
                  </p>
                </div>
                
                {/* 争议焦点 */}
                {parsedContent.legalAnalysis.disputes && parsedContent.legalAnalysis.disputes.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-blue-200">
                    <span className="text-sm font-medium text-gray-700">争议焦点</span>
                    <p className="text-xs text-gray-600">
                      • {parsedContent.legalAnalysis.disputes[0]}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 文本预览 */}
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <h5 className="font-semibold text-gray-700 mb-2">文本内容预览</h5>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {parsedContent.text.substring(0, 500)}...
              </p>
            </div>

            <Button 
              className="w-full"
              onClick={() => onFileProcessed?.(parsedContent)}
            >
              进入下一步分析
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
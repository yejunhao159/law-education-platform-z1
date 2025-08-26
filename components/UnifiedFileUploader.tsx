"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface FileUploadConfig {
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
  minimal?: boolean
  showProgress?: boolean
  onUpload?: (file: File) => Promise<any>
}

interface UnifiedFileUploaderProps extends FileUploadConfig {
  onFileAccepted?: (file: File) => void
  onDataExtracted?: (data: any) => void
  className?: string
}

export function UnifiedFileUploader({
  accept = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt']
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  minimal = false,
  showProgress = true,
  onUpload,
  onFileAccepted,
  onDataExtracted,
  className
}: UnifiedFileUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [extractedData, setExtractedData] = useState<any>(null)

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    setUploadedFile(file)
    setUploadStatus('uploading')
    setUploadProgress(20)
    setErrorMessage('')
    
    onFileAccepted?.(file)
    
    if (onUpload) {
      try {
        setUploadProgress(40)
        setUploadStatus('processing')
        
        const result = await onUpload(file)
        
        setUploadProgress(100)
        setUploadStatus('success')
        setExtractedData(result)
        onDataExtracted?.(result)
      } catch (error) {
        console.error('Upload error:', error)
        setUploadStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '上传失败，请重试')
      }
    } else {
      // 模拟上传进度
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            setUploadStatus('success')
            return 100
          }
          return prev + 10
        })
      }, 200)
    }
  }, [onUpload, onFileAccepted, onDataExtracted])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept,
    maxSize,
    multiple
  })

  const resetUpload = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadedFile(null)
    setErrorMessage('')
    setExtractedData(null)
  }

  // 简约模式
  if (minimal) {
    return (
      <div className={cn("w-full", className)}>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
            uploadStatus === 'success' && "border-green-500 bg-green-50"
          )}
        >
          <input {...getInputProps()} />
          {uploadStatus === 'idle' && (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Upload className="w-4 h-4" />
              <span className="text-sm">{isDragActive ? '释放文件' : '点击或拖拽文件上传'}</span>
            </div>
          )}
          {uploadStatus === 'uploading' && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">上传中...</span>
            </div>
          )}
          {uploadStatus === 'success' && uploadedFile && (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-800">{uploadedFile.name}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 完整模式
  return (
    <Card className={cn("p-6", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          uploadStatus === 'success' && "border-green-500 bg-green-50",
          uploadStatus === 'error' && "border-red-500 bg-red-50"
        )}
      >
        <input {...getInputProps()} />
        
        {uploadStatus === 'idle' && (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? '释放文件以上传' : '拖拽文件到这里，或点击选择'}
            </p>
            <p className="text-sm text-gray-500">
              支持格式：.doc, .docx, .pdf, .txt（最大10MB）
            </p>
            <Button className="mt-4" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              选择文件
            </Button>
          </>
        )}
        
        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-600" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {uploadStatus === 'uploading' ? '正在上传文件...' : '正在处理文件...'}
              </p>
              {uploadedFile && (
                <p className="text-sm text-gray-500 mt-1">{uploadedFile.name}</p>
              )}
            </div>
            {showProgress && (
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            )}
          </div>
        )}
        
        {uploadStatus === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            <div>
              <p className="text-lg font-medium text-gray-700">上传成功！</p>
              {uploadedFile && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-sm">
                    <FileText className="w-3 h-3 mr-1" />
                    {uploadedFile.name}
                  </Badge>
                </div>
              )}
            </div>
            <Button onClick={resetUpload} variant="outline" size="sm">
              重新上传
            </Button>
          </div>
        )}
        
        {uploadStatus === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-red-600" />
            <div>
              <p className="text-lg font-medium text-gray-700">上传失败</p>
              <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
            </div>
            <Button onClick={resetUpload} variant="outline" size="sm">
              重试
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
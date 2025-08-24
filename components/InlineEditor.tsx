'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InlineEditorProps {
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
  label?: string
}

export function InlineEditor({ 
  value, 
  onSave, 
  multiline = false, 
  placeholder = "点击编辑...",
  className = "",
  label 
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      handleSave()
    }
  }

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input
    return (
      <div className={`space-y-2 ${className}`}>
        {label && <h4 className="font-medium mb-1">{label}</h4>}
        <div className="flex items-start gap-2">
          <InputComponent
            ref={inputRef as any}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
            rows={multiline ? 4 : undefined}
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="h-8 w-8 p-0">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {multiline && (
          <p className="text-xs text-gray-500">
            💡 按 Ctrl+Enter 保存，ESC 取消
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`group cursor-pointer ${className}`}>
      {label && <h4 className="font-medium mb-1">{label}</h4>}
      <div 
        className="relative p-2 rounded border border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all"
        onClick={() => setIsEditing(true)}
      >
        <p className="text-sm text-muted-foreground min-h-[20px]">
          {value || <span className="text-gray-400 italic">{placeholder}</span>}
        </p>
        <Edit2 className="absolute top-2 right-2 h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}
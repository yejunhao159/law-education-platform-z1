'use client';

import { useState } from 'react';
import { Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface InlineEditorProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export function InlineEditor({
  label,
  value,
  onSave,
  placeholder = '',
  className = '',
  multiline = false,
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div id="InlineEditorId" className={`space-y-1 ${className}`}>
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {isEditing ? (
        <div className="flex items-start gap-2">
          {multiline ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
              rows={3}
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
          )}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="group flex items-start gap-2 p-2 rounded border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
          onClick={() => {
            setEditValue(value);
            setIsEditing(true);
          }}
        >
          <div className="flex-1 text-sm">
            {value || <span className="text-gray-400">{placeholder}</span>}
          </div>
          <Edit className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

/**
 * Interactive Card Component
 * A flippable, draggable card component with animations
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface InteractiveCardProps {
  id: string;
  frontContent: React.ReactNode;
  backContent?: React.ReactNode;
  isDraggable?: boolean;
  isFlippable?: boolean;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
  frontClassName?: string;
  backClassName?: string;
  disabled?: boolean;
  dragData?: any;
}

export function InteractiveCard({
  id,
  frontContent,
  backContent,
  isDraggable = false,
  isFlippable = false,
  isFlipped = false,
  onFlip,
  className,
  frontClassName,
  backClassName,
  disabled = false,
  dragData,
}: InteractiveCardProps) {
  const [localFlipped, setLocalFlipped] = useState(false);
  const flipped = isFlipped !== undefined ? isFlipped : localFlipped;

  // Draggable setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: dragData,
    disabled: !isDraggable || disabled,
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
  };

  const handleFlip = () => {
    if (!isFlippable || disabled) return;
    
    if (onFlip) {
      onFlip();
    } else {
      setLocalFlipped(!localFlipped);
    }
  };

  const cardVariants = {
    front: {
      rotateY: 0,
      transition: { duration: 0.6, type: "spring", stiffness: 200 }
    },
    back: {
      rotateY: 180,
      transition: { duration: 0.6, type: "spring", stiffness: 200 }
    }
  };

  const containerClasses = cn(
    "relative w-full h-full preserve-3d",
    isDraggable && "cursor-move",
    isDragging && "opacity-50 z-50",
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      style={isDraggable ? dragStyle : undefined}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={containerClasses}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={flipped ? "back" : "front"}
        variants={cardVariants}
        onClick={isFlippable && !isDragging ? handleFlip : undefined}
      >
        {/* Front Face */}
        <Card
          className={cn(
            "absolute inset-0 w-full h-full backface-hidden",
            isFlippable && !disabled && "cursor-pointer hover:shadow-lg transition-shadow",
            frontClassName
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {frontContent}
        </Card>

        {/* Back Face */}
        {backContent && (
          <Card
            className={cn(
              "absolute inset-0 w-full h-full backface-hidden",
              isFlippable && !disabled && "cursor-pointer hover:shadow-lg transition-shadow",
              backClassName
            )}
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {backContent}
          </Card>
        )}
      </motion.div>

      {/* Drag Indicator */}
      {isDraggable && !disabled && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"
          animate={{
            scale: isDragging ? 1.5 : 1,
            opacity: isDragging ? 1 : 0.5
          }}
          transition={{ duration: 0.2 }}
        />
      )}
    </div>
  );
}

// Sortable variant for sortable lists
export function SortableInteractiveCard(props: InteractiveCardProps & { sortableId: string }) {
  const { sortableId, ...cardProps } = props;
  
  // For sortable functionality, we'll use useSortable from @dnd-kit/sortable
  // This is a placeholder - actual implementation would use useSortable
  
  return <InteractiveCard {...cardProps} />;
}
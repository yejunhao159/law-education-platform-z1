/**
 * DnD Provider Component
 * Provides drag and drop context for the application
 */

'use client';

import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

interface DndProviderProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  dragOverlay?: React.ReactNode;
}

export function DndProvider({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragOverlay,
}: DndProviderProps) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);

  // Configure sensors for different input methods
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Activation constraint to prevent accidental drags
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      // Touch delay to distinguish from scrolling
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      // Keyboard navigation support
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd?.(event);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeId && dragOverlay}
      </DragOverlay>
    </DndContext>
  );
}

// Export utility hooks
export { useDraggable, useDroppable } from '@dnd-kit/core';
export { useSortable } from '@dnd-kit/sortable';
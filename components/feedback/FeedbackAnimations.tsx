/**
 * Feedback Animation System
 * Visual feedback components for user interactions
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Trophy,
  Star,
  Zap,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'achievement';

interface FeedbackAnimationProps {
  type: FeedbackType;
  message: string;
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
  onComplete?: () => void;
}

/**
 * Main Feedback Animation Component
 */
export function FeedbackAnimation({
  type,
  message,
  duration = 3000,
  position = 'center',
  onComplete
}: FeedbackAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-8 h-8 text-yellow-500" />;
      case 'achievement':
        return <Trophy className="w-8 h-8 text-purple-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'achievement':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const positionClasses = {
    top: 'top-20',
    center: 'top-1/2 -translate-y-1/2',
    bottom: 'bottom-20'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: position === 'top' ? -50 : position === 'bottom' ? 50 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: position === 'top' ? -50 : position === 'bottom' ? 50 : 0 }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-50',
            positionClasses[position]
          )}
        >
          <div className={cn(
            'flex items-center gap-3 px-6 py-4 rounded-lg border shadow-lg',
            getBackgroundColor()
          )}>
            <motion.div
              animate={{
                rotate: type === 'achievement' ? [0, 360] : 0,
                scale: type === 'success' ? [1, 1.2, 1] : 1
              }}
              transition={{
                duration: 1,
                repeat: type === 'achievement' ? Infinity : 0,
                repeatDelay: 2
              }}
            >
              {getIcon()}
            </motion.div>
            <p className="text-sm font-medium text-gray-900">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Score Animation Component
 */
interface ScoreAnimationProps {
  points: number;
  x?: number;
  y?: number;
  onComplete?: () => void;
}

export function ScoreAnimation({ points, x = 0, y = 0, onComplete }: ScoreAnimationProps) {
  const isPositive = points > 0;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ 
        opacity: 0, 
        y: isPositive ? -50 : 20,
        scale: 1.5
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className="fixed pointer-events-none z-50"
      style={{ left: x, top: y }}
    >
      <div className={cn(
        'font-bold text-2xl',
        isPositive ? 'text-green-500' : 'text-red-500'
      )}>
        {isPositive ? '+' : ''}{points}
      </div>
    </motion.div>
  );
}

/**
 * Success Burst Animation
 */
interface SuccessBurstProps {
  x?: number;
  y?: number;
  particleCount?: number;
}

export function SuccessBurst({ x = 0, y = 0, particleCount = 8 }: SuccessBurstProps) {
  const iconSet = [Star, Heart, Sparkles, Zap] as const;
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const IconComponent = iconSet[i % iconSet.length];
    return {
      id: i,
      angle: (360 / particleCount) * i,
      icon: IconComponent
    };
  });

  return (
    <div className="fixed pointer-events-none z-50" style={{ left: x, top: y }}>
      {particles.map(({ id, angle, icon: Icon }) => (
        <motion.div
          key={id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(angle * Math.PI / 180) * 100,
            y: Math.sin(angle * Math.PI / 180) * 100,
            scale: [0, 1, 0],
            opacity: [1, 1, 0]
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute"
        >
          <Icon className="w-6 h-6 text-yellow-400" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Ripple Effect Animation
 */
interface RippleEffectProps {
  x: number;
  y: number;
  color?: string;
  size?: number;
}

export function RippleEffect({ x, y, color = 'primary', size = 200 }: RippleEffectProps) {
  const colorClasses = {
    primary: 'bg-primary/20',
    success: 'bg-green-500/20',
    error: 'bg-red-500/20',
    warning: 'bg-yellow-500/20'
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'fixed rounded-full pointer-events-none z-40',
        colorClasses[color as keyof typeof colorClasses] || colorClasses.primary
      )}
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size
      }}
    />
  );
}

/**
 * Progress Celebration Animation
 */
interface ProgressCelebrationProps {
  progress: number;
  milestone?: number;
}

export function ProgressCelebration({ progress, milestone = 100 }: ProgressCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (progress >= milestone) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [progress, milestone]);

  if (!showCelebration) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
    >
      <div className="relative">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity }
          }}
        >
          <Trophy className="w-24 h-24 text-yellow-400" />
        </motion.div>
        <SuccessBurst x={0} y={0} />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-lg font-bold text-yellow-600"
        >
          🎉 目标达成！
        </motion.p>
      </div>
    </motion.div>
  );
}

/**
 * Floating Hearts Animation
 */
export function FloatingHearts() {
  const hearts = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    x: Math.random() * 100 - 50
  }));

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 pointer-events-none z-50">
      {hearts.map(({ id, delay, x }) => (
        <motion.div
          key={id}
          initial={{ y: 0, opacity: 0, scale: 0 }}
          animate={{
            y: -200,
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
            x: [0, x, x * 1.5, x * 2]
          }}
          transition={{
            duration: 3,
            delay,
            ease: 'easeOut'
          }}
          className="absolute"
        >
          <Heart className="w-8 h-8 text-red-400 fill-red-400" />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Loading Dots Animation
 */
export function LoadingDots() {
  const dotVariants: Variants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 0, -10],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 0.2, 0.4].map((delay, i) => (
        <motion.div
          key={i}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay }}
          className="w-2 h-2 bg-primary rounded-full"
        />
      ))}
    </div>
  );
}

/**
 * Confetti Animation (Simple CSS version)
 */
export function Confetti() {
  const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: Math.random() * 100,
    animationDelay: Math.random() * 3,
    animationDuration: 3 + Math.random() * 2
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {confettiPieces.map(piece => (
        <motion.div
          key={piece.id}
          initial={{ y: -20, opacity: 1 }}
          animate={{
            y: window.innerHeight + 20,
            rotate: Math.random() * 360,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: piece.animationDuration,
            delay: piece.animationDelay,
            ease: 'linear'
          }}
          className="absolute w-2 h-3"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color
          }}
        />
      ))}
    </div>
  );
}

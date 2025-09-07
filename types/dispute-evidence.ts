/**
 * Core TypeScript interfaces for Dispute and Evidence Analysis System
 * These types extend the existing legal-case types to support
 * interactive dispute focus analysis and evidence quality assessment
 */

import type { LawReference } from './legal-case';

// Enum-like type unions for better type safety
export type DifficultyLevel = 'basic' | 'advanced' | 'professional';
export type TeachingValueLevel = 'high' | 'medium' | 'low';
export type ViewMode = 'watch' | 'practice';
export type FeedbackType = 'success' | 'error' | 'info' | 'warning';
export type ClaimBasisType = 'contractual' | 'tortious' | 'property' | 'unjust_enrichment';

// Quality score type (0-100)
export type QualityScore = number;

/**
 * Represents a dispute focus point in the case
 * Maps to the "争议焦点" concept in Chinese legal education
 */
export interface DisputeFocus {
  id: string;
  content: string;                    // 争议内容
  plaintiffView: string;               // 原告观点
  defendantView: string;               // 被告观点
  courtView: string;                   // 法院认定
  claimBasis: ClaimBasis[];           // 关联的请求权基础
  difficulty: DifficultyLevel;         // 难度等级
  teachingValue: TeachingValueLevel;   // 教学价值
  relatedLaws: LawReference[];        // 相关法条
  createdAt: string;                   // ISO timestamp
  aiAnalysis?: string;                 // AI分析结果 (optional)
  keyPoints?: string[];                // 关键要点 (optional)
}

/**
 * Represents the quality assessment of a piece of evidence
 * Includes the "三性" (three qualities) evaluation in Chinese law
 */
export interface EvidenceQuality {
  id: string;
  evidenceId: string;                  // Reference to Evidence.id
  authenticity: QualityScore;          // 真实性 (0-100)
  relevance: QualityScore;              // 关联性 (0-100)
  legality: QualityScore;               // 合法性 (0-100)
  supportedElements: string[];         // ClaimElement IDs this evidence supports
  challengePoints: string[];            // 质疑点
  overallScore: QualityScore;          // 综合评分
  aiAnalysis?: string;                 // AI quality analysis (optional)
  courtAccepted?: boolean;             // 法院是否采信 (optional)
}

/**
 * Tracks the interactive state of the evidence quality system
 * Used for drag-and-drop, card flipping, and scoring
 */
export interface InteractionState {
  draggedItem: string | null;          // ID of currently dragged item
  dropTarget: string | null;           // ID of current drop target
  flippedCards: Set<string>;           // Set of flipped card IDs
  completedMappings: Map<string, string>; // evidence ID -> element ID mappings
  score: number;                       // Current user score
  feedback: FeedbackMessage[];         // Feedback messages queue
  mode: ViewMode;                      // Current interaction mode
  isAnimating: boolean;                // Animation lock to prevent rapid clicks
  history?: InteractionHistory[];      // Optional undo/redo history
}

/**
 * Feedback message for user interactions
 */
export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  message: string;
  timestamp: number;                   // Unix timestamp
  duration?: number;                   // Display duration in ms (optional)
}

/**
 * Represents a legal claim basis (请求权基础)
 * Core concept from German legal methodology (Anspruchsmethode)
 */
export interface ClaimBasis {
  id: string;
  name: string;                        // e.g., "合同履行请求权"
  legalBasis: string;                  // e.g., "《民法典》第509条"
  elements: ClaimElement[];            // 构成要件
  type: ClaimBasisType;                // Type of claim
  description?: string;                // Detailed explanation (optional)
}

/**
 * Individual element/requirement of a claim basis
 * Each element must be proven for the claim to succeed
 */
export interface ClaimElement {
  id: string;
  claimBasisId: string;                // Parent ClaimBasis ID
  name: string;                        // e.g., "合同成立"
  description: string;                 // Detailed requirement description
  required: boolean;                   // Is this element mandatory?
  proved: boolean;                     // Has this been proven?
  supportingEvidence: string[];        // Evidence IDs that support this element
  burdenOfProof?: 'plaintiff' | 'defendant'; // 举证责任 (optional)
}

/**
 * Interaction history entry for undo/redo functionality
 */
export interface InteractionHistory {
  timestamp: number;
  action: 'drag' | 'drop' | 'flip' | 'reset';
  previousState: Partial<InteractionState>;
  currentState: Partial<InteractionState>;
}

/**
 * Configuration for the dispute analysis system
 */
export interface DisputeAnalysisConfig {
  enableAI: boolean;                   // Enable AI analysis
  difficulty: DifficultyLevel;         // Default difficulty
  showTeachingNotes: boolean;          // Show teaching guidance
  animationSpeed: 'slow' | 'normal' | 'fast'; // Animation speed
  soundEnabled: boolean;               // Enable sound feedback
}

/**
 * Configuration for evidence quality system
 */
export interface EvidenceQualityConfig {
  mode: ViewMode;                      // Default mode
  showHints: boolean;                  // Show hints in practice mode
  allowUndo: boolean;                  // Enable undo/redo
  scoreThreshold: number;              // Pass score threshold (0-100)
  maxAttempts: number;                 // Max attempts in practice mode
}

/**
 * Result of a practice session
 */
export interface PracticeResult {
  userId?: string;                     // Optional user ID
  startTime: number;                   // Session start timestamp
  endTime: number;                     // Session end timestamp
  totalScore: number;                  // Final score
  correctMappings: number;             // Number of correct mappings
  incorrectMappings: number;           // Number of incorrect mappings
  timeSpent: number;                   // Time in seconds
  attempts: number;                    // Number of attempts
  feedback: string;                    // Overall feedback message
}
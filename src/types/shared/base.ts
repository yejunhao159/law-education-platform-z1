/**
 * 共享基础类型定义
 * DeepPractice Standards Compliant
 */

import { z } from 'zod';

// ========== 基础实体类型 ==========
export const BaseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const BaseEntityPartialSchema = BaseEntitySchema.partial();

// ========== 分页和排序 ==========
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().min(0).optional(),
});

export const SortOrderSchema = z.enum(['asc', 'desc']);

export const SortSchema = z.object({
  field: z.string(),
  order: SortOrderSchema,
});

// ========== API响应包装 ==========
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime().default(() => new Date().toISOString()),
  });

// ========== 错误处理 ==========
export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
});

// ========== 视角类型 ==========
export const ViewPerspectiveSchema = z.enum(['neutral', 'plaintiff', 'defendant', 'judge']);

// ========== 重要性级别 ==========
export const ImportanceLevelSchema = z.enum(['critical', 'high', 'medium', 'low']);

// ========== TypeScript类型导出 ==========
export type BaseEntity = z.infer<typeof BaseEntitySchema>;
export type BaseEntityPartial = z.infer<typeof BaseEntityPartialSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
};
export type AppError = z.infer<typeof ErrorSchema>;
export type ViewPerspective = z.infer<typeof ViewPerspectiveSchema>;
export type ImportanceLevel = z.infer<typeof ImportanceLevelSchema>;

// ========== 工具函数 ==========
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString(),
});

export const createError = (code: string, message: string, details?: Record<string, unknown>): AppError => ({
  code,
  message,
  details,
});
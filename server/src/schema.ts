import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['parent', 'kid']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  role: userRoleSchema,
  points: z.number().int().nonnegative(), // Only applicable to kids, 0 for parents
  created_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  name: z.string().min(1),
  role: userRoleSchema
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  points: z.number().int().nonnegative().optional()
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Chore frequency enum
export const choreFrequencySchema = z.enum(['daily', 'weekly', 'one_time']);
export type ChoreFrequency = z.infer<typeof choreFrequencySchema>;

// Chore status enum
export const choreStatusSchema = z.enum(['pending', 'completed_pending_approval', 'approved', 'rejected']);
export type ChoreStatus = z.infer<typeof choreStatusSchema>;

// Chore schema
export const choreSchema = z.object({
  id: z.number(),
  name: z.string(),
  point_value: z.number().int().positive(),
  frequency: choreFrequencySchema,
  assigned_kid_id: z.number(),
  status: choreStatusSchema,
  created_by_parent_id: z.number(),
  created_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  approved_at: z.coerce.date().nullable()
});
export type Chore = z.infer<typeof choreSchema>;

// Chore input schemas
export const createChoreInputSchema = z.object({
  name: z.string().min(1),
  point_value: z.number().int().positive(),
  frequency: choreFrequencySchema,
  assigned_kid_id: z.number(),
  created_by_parent_id: z.number()
});
export type CreateChoreInput = z.infer<typeof createChoreInputSchema>;

export const updateChoreInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  point_value: z.number().int().positive().optional(),
  frequency: choreFrequencySchema.optional(),
  assigned_kid_id: z.number().optional()
});
export type UpdateChoreInput = z.infer<typeof updateChoreInputSchema>;

export const markChoreCompletedInputSchema = z.object({
  chore_id: z.number(),
  kid_id: z.number()
});
export type MarkChoreCompletedInput = z.infer<typeof markChoreCompletedInputSchema>;

export const approveChoreInputSchema = z.object({
  chore_id: z.number(),
  parent_id: z.number(),
  approved: z.boolean()
});
export type ApproveChoreInput = z.infer<typeof approveChoreInputSchema>;

// Reward schema
export const rewardSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  point_cost: z.number().int().positive(),
  created_by_parent_id: z.number(),
  created_at: z.coerce.date()
});
export type Reward = z.infer<typeof rewardSchema>;

// Reward input schemas
export const createRewardInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  point_cost: z.number().int().positive(),
  created_by_parent_id: z.number()
});
export type CreateRewardInput = z.infer<typeof createRewardInputSchema>;

export const updateRewardInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  point_cost: z.number().int().positive().optional()
});
export type UpdateRewardInput = z.infer<typeof updateRewardInputSchema>;

// Reward request status enum
export const rewardRequestStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type RewardRequestStatus = z.infer<typeof rewardRequestStatusSchema>;

// Reward request schema
export const rewardRequestSchema = z.object({
  id: z.number(),
  reward_id: z.number(),
  kid_id: z.number(),
  status: rewardRequestStatusSchema,
  requested_at: z.coerce.date(),
  processed_at: z.coerce.date().nullable(),
  processed_by_parent_id: z.number().nullable()
});
export type RewardRequest = z.infer<typeof rewardRequestSchema>;

// Reward request input schemas
export const createRewardRequestInputSchema = z.object({
  reward_id: z.number(),
  kid_id: z.number()
});
export type CreateRewardRequestInput = z.infer<typeof createRewardRequestInputSchema>;

export const processRewardRequestInputSchema = z.object({
  request_id: z.number(),
  parent_id: z.number(),
  approved: z.boolean()
});
export type ProcessRewardRequestInput = z.infer<typeof processRewardRequestInputSchema>;

// Penalty schema
export const penaltySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  point_deduction: z.number().int().positive(),
  created_by_parent_id: z.number(),
  created_at: z.coerce.date()
});
export type Penalty = z.infer<typeof penaltySchema>;

// Penalty input schemas
export const createPenaltyInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  point_deduction: z.number().int().positive(),
  created_by_parent_id: z.number()
});
export type CreatePenaltyInput = z.infer<typeof createPenaltyInputSchema>;

export const updatePenaltyInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  point_deduction: z.number().int().positive().optional()
});
export type UpdatePenaltyInput = z.infer<typeof updatePenaltyInputSchema>;

// Penalty application schema
export const penaltyApplicationSchema = z.object({
  id: z.number(),
  penalty_id: z.number(),
  kid_id: z.number(),
  applied_by_parent_id: z.number(),
  applied_at: z.coerce.date(),
  points_deducted: z.number().int().positive()
});
export type PenaltyApplication = z.infer<typeof penaltyApplicationSchema>;

// Penalty application input schema
export const applyPenaltyInputSchema = z.object({
  penalty_id: z.number(),
  kid_id: z.number(),
  applied_by_parent_id: z.number()
});
export type ApplyPenaltyInput = z.infer<typeof applyPenaltyInputSchema>;

// Point transaction schema for tracking all point changes
export const pointTransactionSchema = z.object({
  id: z.number(),
  kid_id: z.number(),
  transaction_type: z.enum(['chore_completion', 'reward_redemption', 'penalty_application']),
  points_change: z.number().int(), // Can be positive (earned) or negative (spent/deducted)
  reference_id: z.number(), // ID of the chore, reward request, or penalty application
  created_at: z.coerce.date()
});
export type PointTransaction = z.infer<typeof pointTransactionSchema>;
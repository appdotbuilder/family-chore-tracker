import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['parent', 'kid']);
export const choreFrequencyEnum = pgEnum('chore_frequency', ['daily', 'weekly', 'one_time']);
export const choreStatusEnum = pgEnum('chore_status', ['pending', 'completed_pending_approval', 'approved', 'rejected']);
export const rewardRequestStatusEnum = pgEnum('reward_request_status', ['pending', 'approved', 'rejected']);
export const pointTransactionTypeEnum = pgEnum('point_transaction_type', ['chore_completion', 'reward_redemption', 'penalty_application']);

// Users table (both parents and kids)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  points: integer('points').notNull().default(0), // Only applicable to kids, 0 for parents
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chores table
export const choresTable = pgTable('chores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  point_value: integer('point_value').notNull(),
  frequency: choreFrequencyEnum('frequency').notNull(),
  assigned_kid_id: integer('assigned_kid_id').notNull(),
  status: choreStatusEnum('status').notNull().default('pending'),
  created_by_parent_id: integer('created_by_parent_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  approved_at: timestamp('approved_at'),
});

// Rewards table
export const rewardsTable = pgTable('rewards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  image_url: text('image_url'),
  point_cost: integer('point_cost').notNull(),
  created_by_parent_id: integer('created_by_parent_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Reward requests table
export const rewardRequestsTable = pgTable('reward_requests', {
  id: serial('id').primaryKey(),
  reward_id: integer('reward_id').notNull(),
  kid_id: integer('kid_id').notNull(),
  status: rewardRequestStatusEnum('status').notNull().default('pending'),
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  processed_at: timestamp('processed_at'),
  processed_by_parent_id: integer('processed_by_parent_id'),
});

// Penalties table
export const penaltiesTable = pgTable('penalties', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  point_deduction: integer('point_deduction').notNull(),
  created_by_parent_id: integer('created_by_parent_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Penalty applications table
export const penaltyApplicationsTable = pgTable('penalty_applications', {
  id: serial('id').primaryKey(),
  penalty_id: integer('penalty_id').notNull(),
  kid_id: integer('kid_id').notNull(),
  applied_by_parent_id: integer('applied_by_parent_id').notNull(),
  applied_at: timestamp('applied_at').defaultNow().notNull(),
  points_deducted: integer('points_deducted').notNull(),
});

// Point transactions table for tracking all point changes
export const pointTransactionsTable = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  kid_id: integer('kid_id').notNull(),
  transaction_type: pointTransactionTypeEnum('transaction_type').notNull(),
  points_change: integer('points_change').notNull(), // Can be positive (earned) or negative (spent/deducted)
  reference_id: integer('reference_id').notNull(), // ID of the chore, reward request, or penalty application
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  assignedChores: many(choresTable, { relationName: 'assignedKid' }),
  createdChores: many(choresTable, { relationName: 'createdByParent' }),
  createdRewards: many(rewardsTable),
  rewardRequests: many(rewardRequestsTable),
  processedRewardRequests: many(rewardRequestsTable, { relationName: 'processedByParent' }),
  createdPenalties: many(penaltiesTable),
  receivedPenaltyApplications: many(penaltyApplicationsTable, { relationName: 'receivedByKid' }),
  appliedPenaltyApplications: many(penaltyApplicationsTable, { relationName: 'appliedByParent' }),
  pointTransactions: many(pointTransactionsTable),
}));

export const choresRelations = relations(choresTable, ({ one }) => ({
  assignedKid: one(usersTable, {
    fields: [choresTable.assigned_kid_id],
    references: [usersTable.id],
    relationName: 'assignedKid',
  }),
  createdByParent: one(usersTable, {
    fields: [choresTable.created_by_parent_id],
    references: [usersTable.id],
    relationName: 'createdByParent',
  }),
}));

export const rewardsRelations = relations(rewardsTable, ({ one, many }) => ({
  createdByParent: one(usersTable, {
    fields: [rewardsTable.created_by_parent_id],
    references: [usersTable.id],
  }),
  rewardRequests: many(rewardRequestsTable),
}));

export const rewardRequestsRelations = relations(rewardRequestsTable, ({ one }) => ({
  reward: one(rewardsTable, {
    fields: [rewardRequestsTable.reward_id],
    references: [rewardsTable.id],
  }),
  kid: one(usersTable, {
    fields: [rewardRequestsTable.kid_id],
    references: [usersTable.id],
  }),
  processedByParent: one(usersTable, {
    fields: [rewardRequestsTable.processed_by_parent_id],
    references: [usersTable.id],
    relationName: 'processedByParent',
  }),
}));

export const penaltiesRelations = relations(penaltiesTable, ({ one, many }) => ({
  createdByParent: one(usersTable, {
    fields: [penaltiesTable.created_by_parent_id],
    references: [usersTable.id],
  }),
  penaltyApplications: many(penaltyApplicationsTable),
}));

export const penaltyApplicationsRelations = relations(penaltyApplicationsTable, ({ one }) => ({
  penalty: one(penaltiesTable, {
    fields: [penaltyApplicationsTable.penalty_id],
    references: [penaltiesTable.id],
  }),
  kid: one(usersTable, {
    fields: [penaltyApplicationsTable.kid_id],
    references: [usersTable.id],
    relationName: 'receivedByKid',
  }),
  appliedByParent: one(usersTable, {
    fields: [penaltyApplicationsTable.applied_by_parent_id],
    references: [usersTable.id],
    relationName: 'appliedByParent',
  }),
}));

export const pointTransactionsRelations = relations(pointTransactionsTable, ({ one }) => ({
  kid: one(usersTable, {
    fields: [pointTransactionsTable.kid_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Chore = typeof choresTable.$inferSelect;
export type NewChore = typeof choresTable.$inferInsert;

export type Reward = typeof rewardsTable.$inferSelect;
export type NewReward = typeof rewardsTable.$inferInsert;

export type RewardRequest = typeof rewardRequestsTable.$inferSelect;
export type NewRewardRequest = typeof rewardRequestsTable.$inferInsert;

export type Penalty = typeof penaltiesTable.$inferSelect;
export type NewPenalty = typeof penaltiesTable.$inferInsert;

export type PenaltyApplication = typeof penaltyApplicationsTable.$inferSelect;
export type NewPenaltyApplication = typeof penaltyApplicationsTable.$inferInsert;

export type PointTransaction = typeof pointTransactionsTable.$inferSelect;
export type NewPointTransaction = typeof pointTransactionsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  chores: choresTable,
  rewards: rewardsTable,
  rewardRequests: rewardRequestsTable,
  penalties: penaltiesTable,
  penaltyApplications: penaltyApplicationsTable,
  pointTransactions: pointTransactionsTable,
};
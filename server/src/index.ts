import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createUserInputSchema,
  updateUserInputSchema,
  userRoleSchema,
  createChoreInputSchema,
  updateChoreInputSchema,
  markChoreCompletedInputSchema,
  approveChoreInputSchema,
  createRewardInputSchema,
  updateRewardInputSchema,
  createRewardRequestInputSchema,
  processRewardRequestInputSchema,
  createPenaltyInputSchema,
  updatePenaltyInputSchema,
  applyPenaltyInputSchema
} from './schema';

// Handler imports
import { createUser } from './handlers/create_user';
import { getUsers, getUsersByRole, getUserById } from './handlers/get_users';
import { updateUser } from './handlers/update_user';

import { createChore } from './handlers/create_chore';
import { getChores, getChoresByKidId, getChoresByParentId, getChoreById } from './handlers/get_chores';
import { updateChore } from './handlers/update_chore';
import { markChoreCompleted } from './handlers/mark_chore_completed';
import { approveChore } from './handlers/approve_chore';
import { deleteChore } from './handlers/delete_chore';

import { createReward } from './handlers/create_reward';
import { getRewards, getRewardsByParentId, getRewardById } from './handlers/get_rewards';
import { updateReward } from './handlers/update_reward';
import { deleteReward } from './handlers/delete_reward';

import { createRewardRequest } from './handlers/create_reward_request';
import { getRewardRequests, getRewardRequestsByKidId, getPendingRewardRequests, getRewardRequestById } from './handlers/get_reward_requests';
import { processRewardRequest } from './handlers/process_reward_request';

import { createPenalty } from './handlers/create_penalty';
import { getPenalties, getPenaltiesByParentId, getPenaltyById } from './handlers/get_penalties';
import { updatePenalty } from './handlers/update_penalty';
import { deletePenalty } from './handlers/delete_penalty';
import { applyPenalty } from './handlers/apply_penalty';
import { getPenaltyApplications, getPenaltyApplicationsByKidId, getPenaltyApplicationsByParentId } from './handlers/get_penalty_applications';

import { getPointTransactions, getPointTransactionsByKidId } from './handlers/get_point_transactions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  getUsersByRole: publicProcedure
    .input(userRoleSchema)
    .query(({ input }) => getUsersByRole(input)),
  
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Chore management
  createChore: publicProcedure
    .input(createChoreInputSchema)
    .mutation(({ input }) => createChore(input)),
  
  getChores: publicProcedure
    .query(() => getChores()),
  
  getChoresByKidId: publicProcedure
    .input(z.number())
    .query(({ input }) => getChoresByKidId(input)),
  
  getChoresByParentId: publicProcedure
    .input(z.number())
    .query(({ input }) => getChoresByParentId(input)),
  
  getChoreById: publicProcedure
    .input(z.number())
    .query(({ input }) => getChoreById(input)),
  
  updateChore: publicProcedure
    .input(updateChoreInputSchema)
    .mutation(({ input }) => updateChore(input)),
  
  markChoreCompleted: publicProcedure
    .input(markChoreCompletedInputSchema)
    .mutation(({ input }) => markChoreCompleted(input)),
  
  approveChore: publicProcedure
    .input(approveChoreInputSchema)
    .mutation(({ input }) => approveChore(input)),
  
  deleteChore: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteChore(input)),

  // Reward management
  createReward: publicProcedure
    .input(createRewardInputSchema)
    .mutation(({ input }) => createReward(input)),
  
  getRewards: publicProcedure
    .query(() => getRewards()),
  
  getRewardsByParentId: publicProcedure
    .input(z.number())
    .query(({ input }) => getRewardsByParentId(input)),
  
  getRewardById: publicProcedure
    .input(z.number())
    .query(({ input }) => getRewardById(input)),
  
  updateReward: publicProcedure
    .input(updateRewardInputSchema)
    .mutation(({ input }) => updateReward(input)),
  
  deleteReward: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteReward(input)),

  // Reward request management
  createRewardRequest: publicProcedure
    .input(createRewardRequestInputSchema)
    .mutation(({ input }) => createRewardRequest(input)),
  
  getRewardRequests: publicProcedure
    .query(() => getRewardRequests()),
  
  getRewardRequestsByKidId: publicProcedure
    .input(z.number())
    .query(({ input }) => getRewardRequestsByKidId(input)),
  
  getPendingRewardRequests: publicProcedure
    .query(() => getPendingRewardRequests()),
  
  getRewardRequestById: publicProcedure
    .input(z.number())
    .query(({ input }) => getRewardRequestById(input)),
  
  processRewardRequest: publicProcedure
    .input(processRewardRequestInputSchema)
    .mutation(({ input }) => processRewardRequest(input)),

  // Penalty management
  createPenalty: publicProcedure
    .input(createPenaltyInputSchema)
    .mutation(({ input }) => createPenalty(input)),
  
  getPenalties: publicProcedure
    .query(() => getPenalties()),
  
  getPenaltiesByParentId: publicProcedure
    .input(z.number())
    .query(({ input }) => getPenaltiesByParentId(input)),
  
  getPenaltyById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPenaltyById(input)),
  
  updatePenalty: publicProcedure
    .input(updatePenaltyInputSchema)
    .mutation(({ input }) => updatePenalty(input)),
  
  deletePenalty: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deletePenalty(input)),

  // Penalty application management
  applyPenalty: publicProcedure
    .input(applyPenaltyInputSchema)
    .mutation(({ input }) => applyPenalty(input)),
  
  getPenaltyApplications: publicProcedure
    .query(() => getPenaltyApplications()),
  
  getPenaltyApplicationsByKidId: publicProcedure
    .input(z.number())
    .query(({ input }) => getPenaltyApplicationsByKidId(input)),
  
  getPenaltyApplicationsByParentId: publicProcedure
    .input(z.number())
    .query(({ input }) => getPenaltyApplicationsByParentId(input)),

  // Point transaction tracking
  getPointTransactions: publicProcedure
    .query(() => getPointTransactions()),
  
  getPointTransactionsByKidId: publicProcedure
    .input(z.number())
    .query(({ input }) => getPointTransactionsByKidId(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
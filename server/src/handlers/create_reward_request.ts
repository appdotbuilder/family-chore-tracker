import { db } from '../db';
import { rewardRequestsTable, rewardsTable, usersTable } from '../db/schema';
import { type CreateRewardRequestInput, type RewardRequest } from '../schema';
import { eq } from 'drizzle-orm';

export async function createRewardRequest(input: CreateRewardRequestInput): Promise<RewardRequest> {
  try {
    // 1. Validate that the reward exists
    const reward = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, input.reward_id))
      .execute();

    if (reward.length === 0) {
      throw new Error('Reward not found');
    }

    // 2. Validate that the kid exists and has enough points for the reward
    const kid = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.kid_id))
      .execute();

    if (kid.length === 0) {
      throw new Error('Kid not found');
    }

    const kidUser = kid[0];
    if (kidUser.role !== 'kid') {
      throw new Error('Only kids can request rewards');
    }

    if (kidUser.points < reward[0].point_cost) {
      throw new Error('Insufficient points for this reward');
    }

    // 3. Create the reward request with status 'pending'
    const result = await db.insert(rewardRequestsTable)
      .values({
        reward_id: input.reward_id,
        kid_id: input.kid_id,
        status: 'pending'
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reward request creation failed:', error);
    throw error;
  }
}
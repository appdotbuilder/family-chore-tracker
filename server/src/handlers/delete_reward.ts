import { db } from '../db';
import { rewardsTable, rewardRequestsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deleteReward = async (rewardId: number): Promise<void> => {
  try {
    // Check if reward exists
    const reward = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    if (reward.length === 0) {
      throw new Error('Reward not found');
    }

    // Check if there are any pending reward requests for this reward
    const pendingRequests = await db.select()
      .from(rewardRequestsTable)
      .where(and(
        eq(rewardRequestsTable.reward_id, rewardId),
        eq(rewardRequestsTable.status, 'pending')
      ))
      .execute();

    if (pendingRequests.length > 0) {
      throw new Error('Cannot delete reward with pending requests');
    }

    // Delete the reward (hard deletion as per schema design)
    await db.delete(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

  } catch (error) {
    console.error('Reward deletion failed:', error);
    throw error;
  }
};
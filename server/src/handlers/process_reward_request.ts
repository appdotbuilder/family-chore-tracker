import { db } from '../db';
import { usersTable, rewardRequestsTable, rewardsTable, pointTransactionsTable } from '../db/schema';
import { type ProcessRewardRequestInput, type RewardRequest } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function processRewardRequest(input: ProcessRewardRequestInput): Promise<RewardRequest> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Validate that the reward request exists and is in 'pending' status
      const rewardRequest = await tx.select()
        .from(rewardRequestsTable)
        .innerJoin(rewardsTable, eq(rewardRequestsTable.reward_id, rewardsTable.id))
        .where(
          and(
            eq(rewardRequestsTable.id, input.request_id),
            eq(rewardRequestsTable.status, 'pending')
          )
        )
        .execute();

      if (rewardRequest.length === 0) {
        throw new Error('Reward request not found or not in pending status');
      }

      const requestData = rewardRequest[0].reward_requests;
      const rewardData = rewardRequest[0].rewards;

      // 2. Validate that the requesting user is a parent
      const parent = await tx.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.parent_id),
            eq(usersTable.role, 'parent')
          )
        )
        .execute();

      if (parent.length === 0) {
        throw new Error('Parent not found or user is not a parent');
      }

      // Get kid info for potential point deduction
      const kid = await tx.select()
        .from(usersTable)
        .where(eq(usersTable.id, requestData.kid_id))
        .execute();

      if (kid.length === 0) {
        throw new Error('Kid not found');
      }

      const kidData = kid[0];

      if (input.approved) {
        // 3. If approved - verify the kid still has enough points
        if (kidData.points < rewardData.point_cost) {
          throw new Error('Kid does not have enough points for this reward');
        }

        // Deduct points from the kid's balance
        await tx.update(usersTable)
          .set({
            points: kidData.points - rewardData.point_cost
          })
          .where(eq(usersTable.id, requestData.kid_id))
          .execute();

        // Create a point transaction record
        await tx.insert(pointTransactionsTable)
          .values({
            kid_id: requestData.kid_id,
            transaction_type: 'reward_redemption',
            points_change: -rewardData.point_cost, // Negative because points are being spent
            reference_id: input.request_id
          })
          .execute();
      }

      // Update request status and set processed_at timestamp and processed_by_parent_id
      const updatedRequest = await tx.update(rewardRequestsTable)
        .set({
          status: input.approved ? 'approved' : 'rejected',
          processed_at: new Date(),
          processed_by_parent_id: input.parent_id
        })
        .where(eq(rewardRequestsTable.id, input.request_id))
        .returning()
        .execute();

      return updatedRequest[0];
    });
  } catch (error) {
    console.error('Processing reward request failed:', error);
    throw error;
  }
}
import { db } from '../db';
import { rewardRequestsTable } from '../db/schema';
import { type RewardRequest } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRewardRequests(): Promise<RewardRequest[]> {
  try {
    const results = await db.select()
      .from(rewardRequestsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch reward requests:', error);
    throw error;
  }
}

export async function getRewardRequestsByKidId(kidId: number): Promise<RewardRequest[]> {
  try {
    const results = await db.select()
      .from(rewardRequestsTable)
      .where(eq(rewardRequestsTable.kid_id, kidId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch reward requests by kid ID:', error);
    throw error;
  }
}

export async function getPendingRewardRequests(): Promise<RewardRequest[]> {
  try {
    const results = await db.select()
      .from(rewardRequestsTable)
      .where(eq(rewardRequestsTable.status, 'pending'))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch pending reward requests:', error);
    throw error;
  }
}

export async function getRewardRequestById(id: number): Promise<RewardRequest | null> {
  try {
    const results = await db.select()
      .from(rewardRequestsTable)
      .where(eq(rewardRequestsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch reward request by ID:', error);
    throw error;
  }
}
import { db } from '../db';
import { rewardsTable } from '../db/schema';
import { type Reward } from '../schema';
import { eq } from 'drizzle-orm';

export async function getRewards(): Promise<Reward[]> {
  try {
    const results = await db.select()
      .from(rewardsTable)
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to fetch rewards:', error);
    throw error;
  }
}

export async function getRewardsByParentId(parentId: number): Promise<Reward[]> {
  try {
    const results = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.created_by_parent_id, parentId))
      .execute();
    
    return results;
  } catch (error) {
    console.error('Failed to fetch rewards by parent ID:', error);
    throw error;
  }
}

export async function getRewardById(id: number): Promise<Reward | null> {
  try {
    const results = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, id))
      .execute();
    
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch reward by ID:', error);
    throw error;
  }
}
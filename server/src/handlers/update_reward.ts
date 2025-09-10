import { db } from '../db';
import { rewardsTable } from '../db/schema';
import { type UpdateRewardInput, type Reward } from '../schema';
import { eq } from 'drizzle-orm';

export const updateReward = async (input: UpdateRewardInput): Promise<Reward> => {
  try {
    // Check if reward exists
    const existingReward = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, input.id))
      .execute();

    if (existingReward.length === 0) {
      throw new Error(`Reward with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof rewardsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.image_url !== undefined) {
      updateData.image_url = input.image_url;
    }
    
    if (input.point_cost !== undefined) {
      updateData.point_cost = input.point_cost;
    }

    // Perform update and return the updated record
    const result = await db.update(rewardsTable)
      .set(updateData)
      .where(eq(rewardsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reward update failed:', error);
    throw error;
  }
};
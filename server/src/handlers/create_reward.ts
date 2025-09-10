import { db } from '../db';
import { rewardsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateRewardInput, type Reward } from '../schema';

export const createReward = async (input: CreateRewardInput): Promise<Reward> => {
  try {
    // Validate that the parent exists and has the correct role
    const parent = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by_parent_id))
      .execute();

    if (parent.length === 0) {
      throw new Error('Parent not found');
    }

    if (parent[0].role !== 'parent') {
      throw new Error('Only parents can create rewards');
    }

    // Insert reward record
    const result = await db.insert(rewardsTable)
      .values({
        name: input.name,
        description: input.description,
        image_url: input.image_url,
        point_cost: input.point_cost,
        created_by_parent_id: input.created_by_parent_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Reward creation failed:', error);
    throw error;
  }
};
import { db } from '../db';
import { penaltiesTable, usersTable } from '../db/schema';
import { type CreatePenaltyInput, type Penalty } from '../schema';
import { eq } from 'drizzle-orm';

export const createPenalty = async (input: CreatePenaltyInput): Promise<Penalty> => {
  try {
    // First, validate that the parent creating the penalty exists and is actually a parent
    const parent = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by_parent_id))
      .execute();

    if (parent.length === 0) {
      throw new Error('Parent not found');
    }

    if (parent[0].role !== 'parent') {
      throw new Error('Only parents can create penalties');
    }

    // Insert penalty record
    const result = await db.insert(penaltiesTable)
      .values({
        name: input.name,
        description: input.description,
        point_deduction: input.point_deduction,
        created_by_parent_id: input.created_by_parent_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Penalty creation failed:', error);
    throw error;
  }
};
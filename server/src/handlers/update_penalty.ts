import { db } from '../db';
import { penaltiesTable } from '../db/schema';
import { type UpdatePenaltyInput, type Penalty } from '../schema';
import { eq } from 'drizzle-orm';

export async function updatePenalty(input: UpdatePenaltyInput): Promise<Penalty> {
  try {
    // First, check if penalty exists
    const existingPenalty = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, input.id))
      .execute();

    if (existingPenalty.length === 0) {
      throw new Error(`Penalty with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof penaltiesTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.point_deduction !== undefined) {
      updateData.point_deduction = input.point_deduction;
    }

    // If no fields to update, return the existing penalty
    if (Object.keys(updateData).length === 0) {
      return existingPenalty[0];
    }

    // Update the penalty
    const updatedPenalties = await db.update(penaltiesTable)
      .set(updateData)
      .where(eq(penaltiesTable.id, input.id))
      .returning()
      .execute();

    return updatedPenalties[0];
  } catch (error) {
    console.error('Penalty update failed:', error);
    throw error;
  }
}
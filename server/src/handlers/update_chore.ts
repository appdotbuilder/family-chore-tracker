import { db } from '../db';
import { choresTable } from '../db/schema';
import { type UpdateChoreInput, type Chore } from '../schema';
import { eq } from 'drizzle-orm';

export const updateChore = async (input: UpdateChoreInput): Promise<Chore> => {
  try {
    // First, verify the chore exists
    const existingChore = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, input.id))
      .execute();

    if (existingChore.length === 0) {
      throw new Error(`Chore with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.point_value !== undefined) {
      updateData.point_value = input.point_value;
    }
    
    if (input.frequency !== undefined) {
      updateData.frequency = input.frequency;
    }
    
    if (input.assigned_kid_id !== undefined) {
      updateData.assigned_kid_id = input.assigned_kid_id;
    }

    // If no fields to update, return existing chore
    if (Object.keys(updateData).length === 0) {
      return existingChore[0];
    }

    // Update the chore
    const result = await db.update(choresTable)
      .set(updateData)
      .where(eq(choresTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Chore update failed:', error);
    throw error;
  }
};
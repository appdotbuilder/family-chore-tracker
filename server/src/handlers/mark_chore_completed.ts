import { db } from '../db';
import { choresTable } from '../db/schema';
import { type MarkChoreCompletedInput, type Chore } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markChoreCompleted = async (input: MarkChoreCompletedInput): Promise<Chore> => {
  try {
    // First, verify the chore exists, is assigned to the kid, and is in pending status
    const existingChore = await db
      .select()
      .from(choresTable)
      .where(eq(choresTable.id, input.chore_id))
      .execute();

    if (existingChore.length === 0) {
      throw new Error('Chore not found');
    }

    const chore = existingChore[0];

    // Validate that the chore is assigned to the requesting kid
    if (chore.assigned_kid_id !== input.kid_id) {
      throw new Error('Chore is not assigned to this kid');
    }

    // Validate that the chore is in pending status
    if (chore.status !== 'pending') {
      throw new Error('Chore is not in pending status');
    }

    // Update the chore status to completed_pending_approval and set completed_at
    const result = await db
      .update(choresTable)
      .set({
        status: 'completed_pending_approval',
        completed_at: new Date()
      })
      .where(
        and(
          eq(choresTable.id, input.chore_id),
          eq(choresTable.assigned_kid_id, input.kid_id),
          eq(choresTable.status, 'pending')
        )
      )
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update chore status');
    }

    return result[0];
  } catch (error) {
    console.error('Mark chore completed failed:', error);
    throw error;
  }
};
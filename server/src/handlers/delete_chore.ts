import { db } from '../db';
import { choresTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteChore = async (choreId: number): Promise<void> => {
  try {
    // Check if chore exists first
    const existingChore = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    if (existingChore.length === 0) {
      throw new Error('Chore not found');
    }

    // Delete the chore from database
    await db.delete(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();
  } catch (error) {
    console.error('Chore deletion failed:', error);
    throw error;
  }
};
import { db } from '../db';
import { choresTable } from '../db/schema';
import { type Chore } from '../schema';
import { eq } from 'drizzle-orm';

export async function getChores(): Promise<Chore[]> {
  try {
    const results = await db.select()
      .from(choresTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch chores:', error);
    throw error;
  }
}

export async function getChoresByKidId(kidId: number): Promise<Chore[]> {
  try {
    const results = await db.select()
      .from(choresTable)
      .where(eq(choresTable.assigned_kid_id, kidId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch chores by kid ID:', error);
    throw error;
  }
}

export async function getChoresByParentId(parentId: number): Promise<Chore[]> {
  try {
    const results = await db.select()
      .from(choresTable)
      .where(eq(choresTable.created_by_parent_id, parentId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch chores by parent ID:', error);
    throw error;
  }
}

export async function getChoreById(id: number): Promise<Chore | null> {
  try {
    const results = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch chore by ID:', error);
    throw error;
  }
}
import { db } from '../db';
import { penaltiesTable } from '../db/schema';
import { type Penalty } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPenalties(): Promise<Penalty[]> {
  try {
    const results = await db.select()
      .from(penaltiesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get penalties failed:', error);
    throw error;
  }
}

export async function getPenaltiesByParentId(parentId: number): Promise<Penalty[]> {
  try {
    const results = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.created_by_parent_id, parentId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get penalties by parent ID failed:', error);
    throw error;
  }
}

export async function getPenaltyById(id: number): Promise<Penalty | null> {
  try {
    const results = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get penalty by ID failed:', error);
    throw error;
  }
}
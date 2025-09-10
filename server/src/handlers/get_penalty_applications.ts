import { db } from '../db';
import { penaltyApplicationsTable } from '../db/schema';
import { type PenaltyApplication } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPenaltyApplications(): Promise<PenaltyApplication[]> {
  try {
    const results = await db.select()
      .from(penaltyApplicationsTable)
      .orderBy(desc(penaltyApplicationsTable.applied_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch penalty applications:', error);
    throw error;
  }
}

export async function getPenaltyApplicationsByKidId(kidId: number): Promise<PenaltyApplication[]> {
  try {
    const results = await db.select()
      .from(penaltyApplicationsTable)
      .where(eq(penaltyApplicationsTable.kid_id, kidId))
      .orderBy(desc(penaltyApplicationsTable.applied_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch penalty applications for kid:', error);
    throw error;
  }
}

export async function getPenaltyApplicationsByParentId(parentId: number): Promise<PenaltyApplication[]> {
  try {
    const results = await db.select()
      .from(penaltyApplicationsTable)
      .where(eq(penaltyApplicationsTable.applied_by_parent_id, parentId))
      .orderBy(desc(penaltyApplicationsTable.applied_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch penalty applications by parent:', error);
    throw error;
  }
}
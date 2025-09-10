import { db } from '../db';
import { penaltiesTable, penaltyApplicationsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deletePenalty = async (penaltyId: number): Promise<void> => {
  try {
    // First, verify the penalty exists
    const penalty = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, penaltyId))
      .execute();

    if (penalty.length === 0) {
      throw new Error(`Penalty with id ${penaltyId} not found`);
    }

    // Check if there are any penalty applications using this penalty
    const applications = await db.select()
      .from(penaltyApplicationsTable)
      .where(eq(penaltyApplicationsTable.penalty_id, penaltyId))
      .execute();

    if (applications.length > 0) {
      throw new Error(`Cannot delete penalty: ${applications.length} penalty applications exist for this penalty`);
    }

    // Verify the created_by_parent_id references a valid parent user
    const parent = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, penalty[0].created_by_parent_id))
      .execute();

    if (parent.length === 0 || parent[0].role !== 'parent') {
      throw new Error('Invalid parent reference for penalty');
    }

    // Delete the penalty
    await db.delete(penaltiesTable)
      .where(eq(penaltiesTable.id, penaltyId))
      .execute();

  } catch (error) {
    console.error('Penalty deletion failed:', error);
    throw error;
  }
};
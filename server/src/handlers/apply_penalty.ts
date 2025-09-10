import { db } from '../db';
import { 
  usersTable, 
  penaltiesTable, 
  penaltyApplicationsTable, 
  pointTransactionsTable 
} from '../db/schema';
import { type ApplyPenaltyInput, type PenaltyApplication } from '../schema';
import { eq } from 'drizzle-orm';

export async function applyPenalty(input: ApplyPenaltyInput): Promise<PenaltyApplication> {
  try {
    // 1. Validate that the penalty exists
    const penalties = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, input.penalty_id))
      .execute();

    if (penalties.length === 0) {
      throw new Error('Penalty not found');
    }
    const penalty = penalties[0];

    // 2. Validate that the kid exists and is a kid
    const kids = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.kid_id))
      .execute();

    if (kids.length === 0) {
      throw new Error('Kid not found');
    }
    const kid = kids[0];

    if (kid.role !== 'kid') {
      throw new Error('User is not a kid');
    }

    // 3. Validate that the requesting user is a parent
    const parents = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.applied_by_parent_id))
      .execute();

    if (parents.length === 0) {
      throw new Error('Parent not found');
    }
    const parent = parents[0];

    if (parent.role !== 'parent') {
      throw new Error('User is not a parent');
    }

    // 4. Deduct the penalty points from the kid's balance (can go negative)
    const newPointBalance = kid.points - penalty.point_deduction;
    await db.update(usersTable)
      .set({ points: newPointBalance })
      .where(eq(usersTable.id, input.kid_id))
      .execute();

    // 5. Create a penalty application record
    const penaltyApplicationResult = await db.insert(penaltyApplicationsTable)
      .values({
        penalty_id: input.penalty_id,
        kid_id: input.kid_id,
        applied_by_parent_id: input.applied_by_parent_id,
        points_deducted: penalty.point_deduction
      })
      .returning()
      .execute();

    const penaltyApplication = penaltyApplicationResult[0];

    // 6. Create a point transaction record
    await db.insert(pointTransactionsTable)
      .values({
        kid_id: input.kid_id,
        transaction_type: 'penalty_application',
        points_change: -penalty.point_deduction, // Negative because it's a deduction
        reference_id: penaltyApplication.id
      })
      .execute();

    return penaltyApplication;
  } catch (error) {
    console.error('Penalty application failed:', error);
    throw error;
  }
}
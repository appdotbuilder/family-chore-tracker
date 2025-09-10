import { db } from '../db';
import { choresTable, usersTable, pointTransactionsTable } from '../db/schema';
import { type ApproveChoreInput, type Chore } from '../schema';
import { eq, and } from 'drizzle-orm';

export const approveChore = async (input: ApproveChoreInput): Promise<Chore> => {
  try {
    // Start a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Validate that the chore exists and is in 'completed_pending_approval' status
      const existingChores = await tx
        .select()
        .from(choresTable)
        .where(
          and(
            eq(choresTable.id, input.chore_id),
            eq(choresTable.status, 'completed_pending_approval')
          )
        )
        .execute();

      if (existingChores.length === 0) {
        throw new Error('Chore not found or not pending approval');
      }

      const chore = existingChores[0];

      // 2. Validate that the requesting user is a parent
      const parents = await tx
        .select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.parent_id),
            eq(usersTable.role, 'parent')
          )
        )
        .execute();

      if (parents.length === 0) {
        throw new Error('Parent not found or user is not a parent');
      }

      // 3. Update chore based on approval decision
      const updateData = input.approved
        ? {
            status: 'approved' as const,
            approved_at: new Date()
          }
        : {
            status: 'rejected' as const,
            approved_at: new Date(),
            completed_at: null
          };

      const updatedChores = await tx
        .update(choresTable)
        .set(updateData)
        .where(eq(choresTable.id, input.chore_id))
        .returning()
        .execute();

      const updatedChore = updatedChores[0];

      // 4. If approved, add points to kid's balance and create point transaction
      if (input.approved) {
        // First get current points
        const kids = await tx
          .select({ points: usersTable.points })
          .from(usersTable)
          .where(eq(usersTable.id, chore.assigned_kid_id))
          .execute();

        const currentPoints = kids[0]?.points || 0;

        // Update kid's points by adding the chore's point value
        await tx
          .update(usersTable)
          .set({
            points: currentPoints + chore.point_value
          })
          .where(eq(usersTable.id, chore.assigned_kid_id))
          .execute();

        // Create point transaction record
        await tx
          .insert(pointTransactionsTable)
          .values({
            kid_id: chore.assigned_kid_id,
            transaction_type: 'chore_completion',
            points_change: chore.point_value,
            reference_id: chore.id
          })
          .execute();
      }

      return updatedChore;
    });

    return result;
  } catch (error) {
    console.error('Chore approval failed:', error);
    throw error;
  }
};
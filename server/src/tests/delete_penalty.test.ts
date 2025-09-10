import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, penaltiesTable, penaltyApplicationsTable, pointTransactionsTable } from '../db/schema';
import { deletePenalty } from '../handlers/delete_penalty';
import { eq } from 'drizzle-orm';

describe('deletePenalty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing penalty', async () => {
    // Create a parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Parent User',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create a penalty
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Test Penalty',
        description: 'A test penalty',
        point_deduction: 10,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    // Delete the penalty
    await deletePenalty(penalty[0].id);

    // Verify penalty is deleted
    const deletedPenalty = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, penalty[0].id))
      .execute();

    expect(deletedPenalty).toHaveLength(0);
  });

  it('should throw error when penalty does not exist', async () => {
    await expect(deletePenalty(999)).rejects.toThrow(/penalty with id 999 not found/i);
  });

  it('should throw error when penalty has existing applications', async () => {
    // Create parent and kid users
    const parent = await db.insert(usersTable)
      .values({
        name: 'Parent User',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const kid = await db.insert(usersTable)
      .values({
        name: 'Kid User',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();

    // Create a penalty
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Test Penalty',
        description: 'A test penalty',
        point_deduction: 10,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    // Create a penalty application
    await db.insert(penaltyApplicationsTable)
      .values({
        penalty_id: penalty[0].id,
        kid_id: kid[0].id,
        applied_by_parent_id: parent[0].id,
        points_deducted: 10
      })
      .execute();

    // Try to delete the penalty - should fail
    await expect(deletePenalty(penalty[0].id))
      .rejects.toThrow(/cannot delete penalty.*penalty applications exist/i);

    // Verify penalty still exists
    const existingPenalty = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, penalty[0].id))
      .execute();

    expect(existingPenalty).toHaveLength(1);
  });

  it('should handle penalty with multiple applications', async () => {
    // Create parent and kids
    const parent = await db.insert(usersTable)
      .values({
        name: 'Parent User',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const kid1 = await db.insert(usersTable)
      .values({
        name: 'Kid 1',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();

    const kid2 = await db.insert(usersTable)
      .values({
        name: 'Kid 2',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();

    // Create penalty
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Multiple Applications Penalty',
        description: 'A penalty with multiple applications',
        point_deduction: 15,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    // Create multiple applications
    await db.insert(penaltyApplicationsTable)
      .values([
        {
          penalty_id: penalty[0].id,
          kid_id: kid1[0].id,
          applied_by_parent_id: parent[0].id,
          points_deducted: 15
        },
        {
          penalty_id: penalty[0].id,
          kid_id: kid2[0].id,
          applied_by_parent_id: parent[0].id,
          points_deducted: 15
        }
      ])
      .execute();

    // Try to delete - should mention multiple applications
    await expect(deletePenalty(penalty[0].id))
      .rejects.toThrow(/2 penalty applications exist/i);
  });

  it('should throw error for penalty with invalid parent reference', async () => {
    // Create a penalty with non-existent parent ID (shouldn't happen in normal flow, but testing edge case)
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Invalid Parent Penalty',
        description: 'A penalty with invalid parent',
        point_deduction: 5,
        created_by_parent_id: 999 // Non-existent parent ID
      })
      .returning()
      .execute();

    await expect(deletePenalty(penalty[0].id))
      .rejects.toThrow(/invalid parent reference/i);
  });

  it('should throw error when parent reference is actually a kid', async () => {
    // Create a kid user
    const kid = await db.insert(usersTable)
      .values({
        name: 'Kid User',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();

    // Create penalty with kid as "parent" (edge case)
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Kid Created Penalty',
        description: 'A penalty incorrectly created by a kid',
        point_deduction: 5,
        created_by_parent_id: kid[0].id
      })
      .returning()
      .execute();

    await expect(deletePenalty(penalty[0].id))
      .rejects.toThrow(/invalid parent reference/i);
  });

  it('should successfully delete penalty with valid parent but no applications', async () => {
    // Create parent
    const parent = await db.insert(usersTable)
      .values({
        name: 'Valid Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create penalty
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Clean Delete Penalty',
        description: 'A penalty that should delete cleanly',
        point_deduction: 25,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    // Should delete successfully
    await deletePenalty(penalty[0].id);

    // Verify deletion
    const deletedPenalty = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, penalty[0].id))
      .execute();

    expect(deletedPenalty).toHaveLength(0);
  });
});
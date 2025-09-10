import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, choresTable, pointTransactionsTable } from '../db/schema';
import { type ApproveChoreInput } from '../schema';
import { approveChore } from '../handlers/approve_chore';
import { eq } from 'drizzle-orm';

describe('approveChore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let kidId: number;
  let choreId: number;

  beforeEach(async () => {
    // Create test parent
    const parents = await db
      .insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parents[0].id;

    // Create test kid
    const kids = await db
      .insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 50 // Starting with 50 points
      })
      .returning()
      .execute();
    kidId = kids[0].id;

    // Create test chore in completed_pending_approval status
    const chores = await db
      .insert(choresTable)
      .values({
        name: 'Test Chore',
        point_value: 25,
        frequency: 'daily',
        assigned_kid_id: kidId,
        status: 'completed_pending_approval',
        created_by_parent_id: parentId,
        completed_at: new Date()
      })
      .returning()
      .execute();
    choreId = chores[0].id;
  });

  it('should approve a chore and award points', async () => {
    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: parentId,
      approved: true
    };

    const result = await approveChore(input);

    // Verify chore is updated correctly
    expect(result.id).toEqual(choreId);
    expect(result.status).toEqual('approved');
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeInstanceOf(Date);

    // Verify kid's points were updated
    const updatedKids = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();

    expect(updatedKids[0].points).toEqual(75); // 50 + 25

    // Verify point transaction was created
    const transactions = await db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_type).toEqual('chore_completion');
    expect(transactions[0].points_change).toEqual(25);
    expect(transactions[0].reference_id).toEqual(choreId);
  });

  it('should reject a chore without awarding points', async () => {
    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: parentId,
      approved: false
    };

    const result = await approveChore(input);

    // Verify chore is updated correctly
    expect(result.id).toEqual(choreId);
    expect(result.status).toEqual('rejected');
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull(); // Should be reset to null

    // Verify kid's points were NOT updated
    const updatedKids = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();

    expect(updatedKids[0].points).toEqual(50); // Still 50, unchanged

    // Verify no point transaction was created
    const transactions = await db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should throw error for non-existent chore', async () => {
    const input: ApproveChoreInput = {
      chore_id: 999999,
      parent_id: parentId,
      approved: true
    };

    await expect(approveChore(input)).rejects.toThrow(/chore not found/i);
  });

  it('should throw error for chore not in pending approval status', async () => {
    // Update chore to pending status
    await db
      .update(choresTable)
      .set({ status: 'pending' })
      .where(eq(choresTable.id, choreId))
      .execute();

    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: parentId,
      approved: true
    };

    await expect(approveChore(input)).rejects.toThrow(/not pending approval/i);
  });

  it('should throw error for non-existent parent', async () => {
    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: 999999,
      approved: true
    };

    await expect(approveChore(input)).rejects.toThrow(/parent not found/i);
  });

  it('should throw error when user is not a parent', async () => {
    // Create another kid user
    const kids = await db
      .insert(usersTable)
      .values({
        name: 'Another Kid',
        role: 'kid',
        points: 0
      })
      .returning()
      .execute();

    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: kids[0].id, // Using kid ID instead of parent ID
      approved: true
    };

    await expect(approveChore(input)).rejects.toThrow(/not a parent/i);
  });

  it('should handle kid with zero points correctly when approving', async () => {
    // Create a kid with 0 points
    const zeroPointKids = await db
      .insert(usersTable)
      .values({
        name: 'Zero Point Kid',
        role: 'kid',
        points: 0
      })
      .returning()
      .execute();

    // Create chore for this kid
    const zeroPointChores = await db
      .insert(choresTable)
      .values({
        name: 'Zero Point Chore',
        point_value: 10,
        frequency: 'weekly',
        assigned_kid_id: zeroPointKids[0].id,
        status: 'completed_pending_approval',
        created_by_parent_id: parentId,
        completed_at: new Date()
      })
      .returning()
      .execute();

    const input: ApproveChoreInput = {
      chore_id: zeroPointChores[0].id,
      parent_id: parentId,
      approved: true
    };

    const result = await approveChore(input);

    expect(result.status).toEqual('approved');

    // Verify points were added correctly (0 + 10 = 10)
    const updatedKids = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, zeroPointKids[0].id))
      .execute();

    expect(updatedKids[0].points).toEqual(10);
  });

  it('should save chore data correctly to database', async () => {
    const input: ApproveChoreInput = {
      chore_id: choreId,
      parent_id: parentId,
      approved: true
    };

    await approveChore(input);

    // Query database directly to verify changes
    const updatedChores = await db
      .select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    expect(updatedChores).toHaveLength(1);
    expect(updatedChores[0].status).toEqual('approved');
    expect(updatedChores[0].approved_at).toBeInstanceOf(Date);
    expect(updatedChores[0].completed_at).toBeInstanceOf(Date);
  });
});
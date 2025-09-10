import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { choresTable, usersTable } from '../db/schema';
import { deleteChore } from '../handlers/delete_chore';
import { eq } from 'drizzle-orm';

describe('deleteChore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing chore', async () => {
    // Create test users first
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 0
      })
      .returning()
      .execute();

    const parentId = parentResult[0].id;
    const kidId = kidResult[0].id;

    // Create test chore
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Test Chore',
        point_value: 10,
        frequency: 'daily',
        assigned_kid_id: kidId,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();

    const choreId = choreResult[0].id;

    // Verify chore exists before deletion
    const choreBefore = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    expect(choreBefore).toHaveLength(1);
    expect(choreBefore[0].name).toEqual('Test Chore');

    // Delete the chore
    await deleteChore(choreId);

    // Verify chore is deleted
    const choreAfter = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    expect(choreAfter).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent chore', async () => {
    const nonExistentChoreId = 999;

    await expect(deleteChore(nonExistentChoreId)).rejects.toThrow(/chore not found/i);
  });

  it('should handle database errors gracefully', async () => {
    // Create test users and chore first
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 0
      })
      .returning()
      .execute();

    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Test Chore',
        point_value: 15,
        frequency: 'weekly',
        assigned_kid_id: kidResult[0].id,
        created_by_parent_id: parentResult[0].id
      })
      .returning()
      .execute();

    const choreId = choreResult[0].id;

    // Delete chore successfully first time
    await deleteChore(choreId);

    // Try to delete the same chore again (should fail)
    await expect(deleteChore(choreId)).rejects.toThrow(/chore not found/i);
  });

  it('should delete chore with different statuses', async () => {
    // Create test users
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 0
      })
      .returning()
      .execute();

    // Create chore with completed status
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Completed Chore',
        point_value: 20,
        frequency: 'one_time',
        assigned_kid_id: kidResult[0].id,
        created_by_parent_id: parentResult[0].id,
        status: 'approved',
        completed_at: new Date(),
        approved_at: new Date()
      })
      .returning()
      .execute();

    const choreId = choreResult[0].id;

    // Should be able to delete completed chore
    await deleteChore(choreId);

    // Verify deletion
    const choreAfter = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    expect(choreAfter).toHaveLength(0);
  });
});
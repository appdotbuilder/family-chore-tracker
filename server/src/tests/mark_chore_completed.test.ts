import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, choresTable } from '../db/schema';
import { type MarkChoreCompletedInput } from '../schema';
import { markChoreCompleted } from '../handlers/mark_chore_completed';
import { eq } from 'drizzle-orm';

describe('markChoreCompleted', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark a chore as completed by the assigned kid', async () => {
    // Create test parent and kid
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kidResult = await db.insert(usersTable)
      .values({ name: 'Test Kid', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid = kidResult[0];

    // Create test chore
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Clean Room',
        point_value: 10,
        frequency: 'daily',
        assigned_kid_id: kid.id,
        status: 'pending',
        created_by_parent_id: parent.id
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid.id
    };

    const result = await markChoreCompleted(input);

    // Validate the result
    expect(result.id).toBe(chore.id);
    expect(result.status).toBe('completed_pending_approval');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.approved_at).toBeNull();
    expect(result.assigned_kid_id).toBe(kid.id);
    expect(result.name).toBe('Clean Room');
    expect(result.point_value).toBe(10);
  });

  it('should update the chore in the database', async () => {
    // Create test parent and kid
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kidResult = await db.insert(usersTable)
      .values({ name: 'Test Kid', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid = kidResult[0];

    // Create test chore
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Take Out Trash',
        point_value: 5,
        frequency: 'weekly',
        assigned_kid_id: kid.id,
        status: 'pending',
        created_by_parent_id: parent.id
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid.id
    };

    await markChoreCompleted(input);

    // Verify the chore was updated in the database
    const updatedChores = await db
      .select()
      .from(choresTable)
      .where(eq(choresTable.id, chore.id))
      .execute();

    expect(updatedChores).toHaveLength(1);
    const updatedChore = updatedChores[0];
    expect(updatedChore.status).toBe('completed_pending_approval');
    expect(updatedChore.completed_at).toBeInstanceOf(Date);
    expect(updatedChore.approved_at).toBeNull();
  });

  it('should throw error when chore does not exist', async () => {
    const input: MarkChoreCompletedInput = {
      chore_id: 999,
      kid_id: 1
    };

    await expect(markChoreCompleted(input)).rejects.toThrow(/chore not found/i);
  });

  it('should throw error when chore is not assigned to the kid', async () => {
    // Create test parent and two kids
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kid1Result = await db.insert(usersTable)
      .values({ name: 'Kid 1', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid1 = kid1Result[0];

    const kid2Result = await db.insert(usersTable)
      .values({ name: 'Kid 2', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid2 = kid2Result[0];

    // Create chore assigned to kid1
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Do Homework',
        point_value: 15,
        frequency: 'daily',
        assigned_kid_id: kid1.id,
        status: 'pending',
        created_by_parent_id: parent.id
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid2.id // Different kid trying to complete the chore
    };

    await expect(markChoreCompleted(input)).rejects.toThrow(/chore is not assigned to this kid/i);
  });

  it('should throw error when chore is not in pending status', async () => {
    // Create test parent and kid
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kidResult = await db.insert(usersTable)
      .values({ name: 'Test Kid', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid = kidResult[0];

    // Create chore with completed_pending_approval status
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Feed Pet',
        point_value: 8,
        frequency: 'daily',
        assigned_kid_id: kid.id,
        status: 'completed_pending_approval',
        created_by_parent_id: parent.id,
        completed_at: new Date()
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid.id
    };

    await expect(markChoreCompleted(input)).rejects.toThrow(/chore is not in pending status/i);
  });

  it('should throw error when chore is already approved', async () => {
    // Create test parent and kid
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kidResult = await db.insert(usersTable)
      .values({ name: 'Test Kid', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid = kidResult[0];

    // Create chore with approved status
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Make Bed',
        point_value: 5,
        frequency: 'daily',
        assigned_kid_id: kid.id,
        status: 'approved',
        created_by_parent_id: parent.id,
        completed_at: new Date(),
        approved_at: new Date()
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid.id
    };

    await expect(markChoreCompleted(input)).rejects.toThrow(/chore is not in pending status/i);
  });

  it('should throw error when chore is rejected', async () => {
    // Create test parent and kid
    const parentResult = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();
    const parent = parentResult[0];

    const kidResult = await db.insert(usersTable)
      .values({ name: 'Test Kid', role: 'kid', points: 0 })
      .returning()
      .execute();
    const kid = kidResult[0];

    // Create chore with rejected status
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Wash Dishes',
        point_value: 12,
        frequency: 'daily',
        assigned_kid_id: kid.id,
        status: 'rejected',
        created_by_parent_id: parent.id,
        completed_at: new Date(),
        approved_at: new Date()
      })
      .returning()
      .execute();
    const chore = choreResult[0];

    const input: MarkChoreCompletedInput = {
      chore_id: chore.id,
      kid_id: kid.id
    };

    await expect(markChoreCompleted(input)).rejects.toThrow(/chore is not in pending status/i);
  });
});
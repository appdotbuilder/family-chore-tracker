import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { choresTable, usersTable } from '../db/schema';
import { type CreateChoreInput } from '../schema';
import { createChore } from '../handlers/create_chore';
import { eq } from 'drizzle-orm';

describe('createChore', () => {
  let parentId: number;
  let kidId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite parent user
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parentResult[0].id;

    // Create prerequisite kid user
    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();
    kidId = kidResult[0].id;
  });

  afterEach(resetDB);

  it('should create a chore with valid parent and kid', async () => {
    const testInput: CreateChoreInput = {
      name: 'Clean Room',
      point_value: 10,
      frequency: 'daily',
      assigned_kid_id: kidId,
      created_by_parent_id: parentId
    };

    const result = await createChore(testInput);

    // Verify basic fields
    expect(result.name).toEqual('Clean Room');
    expect(result.point_value).toEqual(10);
    expect(result.frequency).toEqual('daily');
    expect(result.assigned_kid_id).toEqual(kidId);
    expect(result.created_by_parent_id).toEqual(parentId);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should save chore to database', async () => {
    const testInput: CreateChoreInput = {
      name: 'Take Out Trash',
      point_value: 5,
      frequency: 'weekly',
      assigned_kid_id: kidId,
      created_by_parent_id: parentId
    };

    const result = await createChore(testInput);

    // Query database to verify persistence
    const chores = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, result.id))
      .execute();

    expect(chores).toHaveLength(1);
    expect(chores[0].name).toEqual('Take Out Trash');
    expect(chores[0].point_value).toEqual(5);
    expect(chores[0].frequency).toEqual('weekly');
    expect(chores[0].assigned_kid_id).toEqual(kidId);
    expect(chores[0].created_by_parent_id).toEqual(parentId);
    expect(chores[0].status).toEqual('pending');
    expect(chores[0].created_at).toBeInstanceOf(Date);
  });

  it('should create one-time chore', async () => {
    const testInput: CreateChoreInput = {
      name: 'Organize Garage',
      point_value: 25,
      frequency: 'one_time',
      assigned_kid_id: kidId,
      created_by_parent_id: parentId
    };

    const result = await createChore(testInput);

    expect(result.frequency).toEqual('one_time');
    expect(result.point_value).toEqual(25);
    expect(result.status).toEqual('pending');
  });

  it('should throw error when assigned kid does not exist', async () => {
    const testInput: CreateChoreInput = {
      name: 'Invalid Chore',
      point_value: 10,
      frequency: 'daily',
      assigned_kid_id: 99999, // Non-existent kid ID
      created_by_parent_id: parentId
    };

    await expect(createChore(testInput))
      .rejects
      .toThrow(/assigned kid does not exist/i);
  });

  it('should throw error when assigned user is not a kid', async () => {
    // Create another parent user to test with
    const anotherParentResult = await db.insert(usersTable)
      .values({
        name: 'Another Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const testInput: CreateChoreInput = {
      name: 'Invalid Chore',
      point_value: 10,
      frequency: 'daily',
      assigned_kid_id: anotherParentResult[0].id, // Parent ID instead of kid ID
      created_by_parent_id: parentId
    };

    await expect(createChore(testInput))
      .rejects
      .toThrow(/assigned kid does not exist or is not a valid kid user/i);
  });

  it('should throw error when creating parent does not exist', async () => {
    const testInput: CreateChoreInput = {
      name: 'Invalid Chore',
      point_value: 10,
      frequency: 'daily',
      assigned_kid_id: kidId,
      created_by_parent_id: 99999 // Non-existent parent ID
    };

    await expect(createChore(testInput))
      .rejects
      .toThrow(/creating parent does not exist/i);
  });

  it('should throw error when creating user is not a parent', async () => {
    // Create another kid user to test with
    const anotherKidResult = await db.insert(usersTable)
      .values({
        name: 'Another Kid',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();

    const testInput: CreateChoreInput = {
      name: 'Invalid Chore',
      point_value: 10,
      frequency: 'daily',
      assigned_kid_id: kidId,
      created_by_parent_id: anotherKidResult[0].id // Kid ID instead of parent ID
    };

    await expect(createChore(testInput))
      .rejects
      .toThrow(/creating parent does not exist or is not a valid parent user/i);
  });

  it('should handle different chore frequencies correctly', async () => {
    const frequencies = ['daily', 'weekly', 'one_time'] as const;
    
    for (const frequency of frequencies) {
      const testInput: CreateChoreInput = {
        name: `${frequency} Chore`,
        point_value: 15,
        frequency,
        assigned_kid_id: kidId,
        created_by_parent_id: parentId
      };

      const result = await createChore(testInput);
      expect(result.frequency).toEqual(frequency);
      expect(result.name).toEqual(`${frequency} Chore`);
    }
  });
});
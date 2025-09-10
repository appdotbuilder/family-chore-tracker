import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, choresTable } from '../db/schema';
import { type UpdateChoreInput, type CreateUserInput } from '../schema';
import { updateChore } from '../handlers/update_chore';
import { eq } from 'drizzle-orm';

// Test data
const testParent: CreateUserInput = {
  name: 'Test Parent',
  role: 'parent'
};

const testKid: CreateUserInput = {
  name: 'Test Kid',
  role: 'kid'
};

const testKid2: CreateUserInput = {
  name: 'Another Kid',
  role: 'kid'
};

describe('updateChore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let kidId: number;
  let kidId2: number;
  let choreId: number;

  beforeEach(async () => {
    // Create parent user
    const parentResult = await db.insert(usersTable)
      .values(testParent)
      .returning()
      .execute();
    parentId = parentResult[0].id;

    // Create kid users
    const kidResult = await db.insert(usersTable)
      .values(testKid)
      .returning()
      .execute();
    kidId = kidResult[0].id;

    const kidResult2 = await db.insert(usersTable)
      .values(testKid2)
      .returning()
      .execute();
    kidId2 = kidResult2[0].id;

    // Create a test chore
    const choreResult = await db.insert(choresTable)
      .values({
        name: 'Original Chore',
        point_value: 10,
        frequency: 'daily',
        assigned_kid_id: kidId,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    choreId = choreResult[0].id;
  });

  it('should update chore name', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      name: 'Updated Chore Name'
    };

    const result = await updateChore(input);

    expect(result.name).toEqual('Updated Chore Name');
    expect(result.point_value).toEqual(10); // Should remain unchanged
    expect(result.frequency).toEqual('daily'); // Should remain unchanged
    expect(result.assigned_kid_id).toEqual(kidId); // Should remain unchanged
    expect(result.id).toEqual(choreId);
  });

  it('should update point value', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      point_value: 25
    };

    const result = await updateChore(input);

    expect(result.point_value).toEqual(25);
    expect(result.name).toEqual('Original Chore'); // Should remain unchanged
    expect(result.frequency).toEqual('daily'); // Should remain unchanged
    expect(result.assigned_kid_id).toEqual(kidId); // Should remain unchanged
  });

  it('should update frequency', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      frequency: 'weekly'
    };

    const result = await updateChore(input);

    expect(result.frequency).toEqual('weekly');
    expect(result.name).toEqual('Original Chore'); // Should remain unchanged
    expect(result.point_value).toEqual(10); // Should remain unchanged
    expect(result.assigned_kid_id).toEqual(kidId); // Should remain unchanged
  });

  it('should update assigned kid', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      assigned_kid_id: kidId2
    };

    const result = await updateChore(input);

    expect(result.assigned_kid_id).toEqual(kidId2);
    expect(result.name).toEqual('Original Chore'); // Should remain unchanged
    expect(result.point_value).toEqual(10); // Should remain unchanged
    expect(result.frequency).toEqual('daily'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      name: 'Multi-Update Chore',
      point_value: 15,
      frequency: 'one_time',
      assigned_kid_id: kidId2
    };

    const result = await updateChore(input);

    expect(result.name).toEqual('Multi-Update Chore');
    expect(result.point_value).toEqual(15);
    expect(result.frequency).toEqual('one_time');
    expect(result.assigned_kid_id).toEqual(kidId2);
    expect(result.id).toEqual(choreId);
  });

  it('should return unchanged chore when no fields to update', async () => {
    const input: UpdateChoreInput = {
      id: choreId
    };

    const result = await updateChore(input);

    expect(result.name).toEqual('Original Chore');
    expect(result.point_value).toEqual(10);
    expect(result.frequency).toEqual('daily');
    expect(result.assigned_kid_id).toEqual(kidId);
    expect(result.id).toEqual(choreId);
  });

  it('should persist changes to database', async () => {
    const input: UpdateChoreInput = {
      id: choreId,
      name: 'Database Test Chore',
      point_value: 30
    };

    await updateChore(input);

    // Verify changes are persisted in database
    const dbChore = await db.select()
      .from(choresTable)
      .where(eq(choresTable.id, choreId))
      .execute();

    expect(dbChore).toHaveLength(1);
    expect(dbChore[0].name).toEqual('Database Test Chore');
    expect(dbChore[0].point_value).toEqual(30);
    expect(dbChore[0].frequency).toEqual('daily'); // Should remain unchanged
  });

  it('should throw error when chore does not exist', async () => {
    const input: UpdateChoreInput = {
      id: 999999, // Non-existent ID
      name: 'This should fail'
    };

    expect(updateChore(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve status and timestamps during update', async () => {
    // First, update the chore status to completed
    await db.update(choresTable)
      .set({ 
        status: 'completed_pending_approval',
        completed_at: new Date()
      })
      .where(eq(choresTable.id, choreId))
      .execute();

    const input: UpdateChoreInput = {
      id: choreId,
      name: 'Status Preservation Test'
    };

    const result = await updateChore(input);

    expect(result.name).toEqual('Status Preservation Test');
    expect(result.status).toEqual('completed_pending_approval');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.approved_at).toBeNull();
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test inputs
const createTestParent: CreateUserInput = {
  name: 'Test Parent',
  role: 'parent'
};

const createTestKid: CreateUserInput = {
  name: 'Test Kid',
  role: 'kid'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user name', async () => {
    // Create a test user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 0
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Updated Kid Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Updated Kid Name');
    expect(result.role).toEqual('kid');
    expect(result.points).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user points', async () => {
    // Create a test kid user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 50
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      points: 100
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Test Kid');
    expect(result.role).toEqual('kid');
    expect(result.points).toEqual(100);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update both name and points', async () => {
    // Create a test kid user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 25
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Super Kid',
      points: 200
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Super Kid');
    expect(result.role).toEqual('kid');
    expect(result.points).toEqual(200);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update points to zero', async () => {
    // Create a test kid user with some points
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 150
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      points: 0
    };

    const result = await updateUser(updateInput);

    expect(result.points).toEqual(0);
  });

  it('should save updated user to database', async () => {
    // Create a test user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestParent.name,
        role: createTestParent.role,
        points: 0
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Updated Parent Name'
    };

    const result = await updateUser(updateInput);

    // Verify the update was saved to database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Updated Parent Name');
    expect(users[0].role).toEqual('parent');
    expect(users[0].points).toEqual(0);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should return unchanged user when no fields are provided', async () => {
    // Create a test user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 75
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id
      // No name or points provided
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Test Kid');
    expect(result.role).toEqual('kid');
    expect(result.points).toEqual(75);
    expect(result.created_at).toEqual(createdUser.created_at);
  });

  it('should work with parent users', async () => {
    // Create a test parent user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestParent.name,
        role: createTestParent.role,
        points: 0
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'Super Parent'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.name).toEqual('Super Parent');
    expect(result.role).toEqual('parent');
    expect(result.points).toEqual(0);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 999, // Non-existent ID
      name: 'Non-existent User'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle empty name gracefully', async () => {
    // Create a test user
    const [createdUser] = await db.insert(usersTable)
      .values({
        name: createTestKid.name,
        role: createTestKid.role,
        points: 0
      })
      .returning()
      .execute();

    // Note: Empty string would be caught by Zod validation (min length 1)
    // This test demonstrates the handler works with valid minimal input
    const updateInput: UpdateUserInput = {
      id: createdUser.id,
      name: 'A' // Minimal valid name
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('A');
    expect(result.id).toEqual(createdUser.id);
  });
});
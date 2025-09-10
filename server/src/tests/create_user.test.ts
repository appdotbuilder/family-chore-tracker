import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const parentInput: CreateUserInput = {
    name: 'Test Parent',
    role: 'parent'
  };

  const kidInput: CreateUserInput = {
    name: 'Test Kid',
    role: 'kid'
  };

  it('should create a parent user', async () => {
    const result = await createUser(parentInput);

    // Basic field validation
    expect(result.name).toEqual('Test Parent');
    expect(result.role).toEqual('parent');
    expect(result.points).toEqual(0);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a kid user', async () => {
    const result = await createUser(kidInput);

    // Basic field validation
    expect(result.name).toEqual('Test Kid');
    expect(result.role).toEqual('kid');
    expect(result.points).toEqual(0);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save parent user to database', async () => {
    const result = await createUser(parentInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Test Parent');
    expect(users[0].role).toEqual('parent');
    expect(users[0].points).toEqual(0);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should save kid user to database', async () => {
    const result = await createUser(kidInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Test Kid');
    expect(users[0].role).toEqual('kid');
    expect(users[0].points).toEqual(0);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should initialize points to 0 for both parents and kids', async () => {
    const parentResult = await createUser(parentInput);
    const kidResult = await createUser(kidInput);

    expect(parentResult.points).toEqual(0);
    expect(kidResult.points).toEqual(0);

    // Verify in database
    const parentFromDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, parentResult.id))
      .execute();

    const kidFromDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidResult.id))
      .execute();

    expect(parentFromDb[0].points).toEqual(0);
    expect(kidFromDb[0].points).toEqual(0);
  });

  it('should create multiple users with unique IDs', async () => {
    const user1 = await createUser({ name: 'Parent 1', role: 'parent' });
    const user2 = await createUser({ name: 'Kid 1', role: 'kid' });
    const user3 = await createUser({ name: 'Parent 2', role: 'parent' });

    // All should have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.id).not.toEqual(user3.id);
    expect(user2.id).not.toEqual(user3.id);

    // All should be persisted in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
    expect(allUsers.map(u => u.name)).toContain('Parent 1');
    expect(allUsers.map(u => u.name)).toContain('Kid 1');
    expect(allUsers.map(u => u.name)).toContain('Parent 2');
  });

  it('should handle empty name correctly', async () => {
    const emptyNameInput: CreateUserInput = {
      name: '',
      role: 'parent'
    };

    const result = await createUser(emptyNameInput);

    expect(result.name).toEqual('');
    expect(result.role).toEqual('parent');
    expect(result.points).toEqual(0);
  });

  it('should preserve created_at timestamp consistency', async () => {
    const beforeCreation = new Date();
    const result = await createUser(parentInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreation).toBe(true);
    expect(result.created_at <= afterCreation).toBe(true);

    // Verify timestamp is preserved in database
    const userFromDb = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(userFromDb[0].created_at).toBeInstanceOf(Date);
    expect(userFromDb[0].created_at.getTime()).toEqual(result.created_at.getTime());
  });
});
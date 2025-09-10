import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers, getUsersByRole, getUserById } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await getUsers();
      expect(result).toEqual([]);
    });

    it('should return all users', async () => {
      // Create test users
      await db.insert(usersTable).values([
        { name: 'Parent User', role: 'parent', points: 0 },
        { name: 'Kid User 1', role: 'kid', points: 100 },
        { name: 'Kid User 2', role: 'kid', points: 50 }
      ]).execute();

      const result = await getUsers();

      expect(result).toHaveLength(3);
      expect(result[0].name).toEqual('Parent User');
      expect(result[0].role).toEqual('parent');
      expect(result[0].points).toEqual(0);
      expect(result[0].id).toBeDefined();
      expect(result[0].created_at).toBeInstanceOf(Date);

      expect(result[1].name).toEqual('Kid User 1');
      expect(result[1].role).toEqual('kid');
      expect(result[1].points).toEqual(100);

      expect(result[2].name).toEqual('Kid User 2');
      expect(result[2].role).toEqual('kid');
      expect(result[2].points).toEqual(50);
    });

    it('should return users in creation order', async () => {
      // Create users in specific order
      const firstUser = await db.insert(usersTable)
        .values({ name: 'First User', role: 'parent', points: 0 })
        .returning()
        .execute();

      const secondUser = await db.insert(usersTable)
        .values({ name: 'Second User', role: 'kid', points: 25 })
        .returning()
        .execute();

      const result = await getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(firstUser[0].id);
      expect(result[0].name).toEqual('First User');
      expect(result[1].id).toEqual(secondUser[0].id);
      expect(result[1].name).toEqual('Second User');
    });
  });

  describe('getUsersByRole', () => {
    beforeEach(async () => {
      // Create test users with different roles
      await db.insert(usersTable).values([
        { name: 'Parent 1', role: 'parent', points: 0 },
        { name: 'Parent 2', role: 'parent', points: 0 },
        { name: 'Kid 1', role: 'kid', points: 100 },
        { name: 'Kid 2', role: 'kid', points: 75 },
        { name: 'Kid 3', role: 'kid', points: 0 }
      ]).execute();
    });

    it('should return only parent users when role is parent', async () => {
      const result = await getUsersByRole('parent');

      expect(result).toHaveLength(2);
      result.forEach(user => {
        expect(user.role).toEqual('parent');
        expect(user.points).toEqual(0);
      });
      expect(result[0].name).toEqual('Parent 1');
      expect(result[1].name).toEqual('Parent 2');
    });

    it('should return only kid users when role is kid', async () => {
      const result = await getUsersByRole('kid');

      expect(result).toHaveLength(3);
      result.forEach(user => {
        expect(user.role).toEqual('kid');
        expect(user.id).toBeDefined();
        expect(user.created_at).toBeInstanceOf(Date);
      });
      expect(result[0].name).toEqual('Kid 1');
      expect(result[0].points).toEqual(100);
      expect(result[1].name).toEqual('Kid 2');
      expect(result[1].points).toEqual(75);
      expect(result[2].name).toEqual('Kid 3');
      expect(result[2].points).toEqual(0);
    });

    it('should return empty array when no users have specified role', async () => {
      // Clear all users first
      await db.delete(usersTable).execute();
      
      // Add only parent users
      await db.insert(usersTable)
        .values({ name: 'Only Parent', role: 'parent', points: 0 })
        .execute();

      const result = await getUsersByRole('kid');
      expect(result).toEqual([]);
    });

    it('should return empty array when no users exist', async () => {
      // Clear all users
      await db.delete(usersTable).execute();

      const parentResult = await getUsersByRole('parent');
      const kidResult = await getUsersByRole('kid');

      expect(parentResult).toEqual([]);
      expect(kidResult).toEqual([]);
    });
  });

  describe('getUserById', () => {
    let testUserId: number;

    beforeEach(async () => {
      // Create test users
      const users = await db.insert(usersTable).values([
        { name: 'Test Parent', role: 'parent', points: 0 },
        { name: 'Test Kid', role: 'kid', points: 150 }
      ]).returning().execute();

      testUserId = users[0].id;
    });

    it('should return user when found by ID', async () => {
      const result = await getUserById(testUserId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testUserId);
      expect(result!.name).toEqual('Test Parent');
      expect(result!.role).toEqual('parent');
      expect(result!.points).toEqual(0);
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should return kid user with points', async () => {
      // Get the kid user ID
      const kidUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.role, 'kid'))
        .execute();

      const result = await getUserById(kidUsers[0].id);

      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Test Kid');
      expect(result!.role).toEqual('kid');
      expect(result!.points).toEqual(150);
    });

    it('should return null when user not found', async () => {
      const result = await getUserById(99999);
      expect(result).toBeNull();
    });

    it('should return null when user ID is negative', async () => {
      const result = await getUserById(-1);
      expect(result).toBeNull();
    });

    it('should return null when no users exist', async () => {
      // Clear all users
      await db.delete(usersTable).execute();

      const result = await getUserById(1);
      expect(result).toBeNull();
    });

    it('should handle user with zero points correctly', async () => {
      // Create user with zero points
      const zeroPointsUser = await db.insert(usersTable)
        .values({ name: 'Zero Points Kid', role: 'kid', points: 0 })
        .returning()
        .execute();

      const result = await getUserById(zeroPointsUser[0].id);

      expect(result).not.toBeNull();
      expect(result!.points).toEqual(0);
      expect(result!.role).toEqual('kid');
    });
  });
});
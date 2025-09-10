import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, choresTable } from '../db/schema';
import { getChores, getChoresByKidId, getChoresByParentId, getChoreById } from '../handlers/get_chores';
import { eq } from 'drizzle-orm';

describe('getChores handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test users and chores
  const setupTestData = async () => {
    // Create parent user
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    const parent = parentResult[0];

    // Create another parent
    const parent2Result = await db.insert(usersTable)
      .values({
        name: 'Another Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    const parent2 = parent2Result[0];

    // Create kid users
    const kid1Result = await db.insert(usersTable)
      .values({
        name: 'Test Kid 1',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();
    const kid1 = kid1Result[0];

    const kid2Result = await db.insert(usersTable)
      .values({
        name: 'Test Kid 2',
        role: 'kid',
        points: 75
      })
      .returning()
      .execute();
    const kid2 = kid2Result[0];

    // Create chores
    const chore1Result = await db.insert(choresTable)
      .values({
        name: 'Clean Room',
        point_value: 10,
        frequency: 'daily',
        assigned_kid_id: kid1.id,
        status: 'pending',
        created_by_parent_id: parent.id
      })
      .returning()
      .execute();

    const chore2Result = await db.insert(choresTable)
      .values({
        name: 'Take Out Trash',
        point_value: 5,
        frequency: 'weekly',
        assigned_kid_id: kid2.id,
        status: 'completed_pending_approval',
        created_by_parent_id: parent.id
      })
      .returning()
      .execute();

    const chore3Result = await db.insert(choresTable)
      .values({
        name: 'Do Dishes',
        point_value: 8,
        frequency: 'daily',
        assigned_kid_id: kid1.id,
        status: 'approved',
        created_by_parent_id: parent2.id
      })
      .returning()
      .execute();

    return {
      parent,
      parent2,
      kid1,
      kid2,
      chore1: chore1Result[0],
      chore2: chore2Result[0],
      chore3: chore3Result[0]
    };
  };

  describe('getChores', () => {
    it('should return all chores', async () => {
      const testData = await setupTestData();
      
      const result = await getChores();

      expect(result).toHaveLength(3);
      
      // Check that all chores are returned
      const choreIds = result.map(chore => chore.id).sort();
      const expectedIds = [testData.chore1.id, testData.chore2.id, testData.chore3.id].sort();
      expect(choreIds).toEqual(expectedIds);

      // Verify structure of first chore
      const chore = result.find(c => c.name === 'Clean Room')!;
      expect(chore.name).toEqual('Clean Room');
      expect(chore.point_value).toEqual(10);
      expect(chore.frequency).toEqual('daily');
      expect(chore.assigned_kid_id).toEqual(testData.kid1.id);
      expect(chore.status).toEqual('pending');
      expect(chore.created_by_parent_id).toEqual(testData.parent.id);
      expect(chore.created_at).toBeInstanceOf(Date);
      expect(chore.completed_at).toBeNull();
      expect(chore.approved_at).toBeNull();
    });

    it('should return empty array when no chores exist', async () => {
      const result = await getChores();
      expect(result).toHaveLength(0);
    });
  });

  describe('getChoresByKidId', () => {
    it('should return chores assigned to specific kid', async () => {
      const testData = await setupTestData();

      const result = await getChoresByKidId(testData.kid1.id);

      expect(result).toHaveLength(2);
      
      // All returned chores should be assigned to kid1
      result.forEach(chore => {
        expect(chore.assigned_kid_id).toEqual(testData.kid1.id);
      });

      // Check specific chores
      const choreNames = result.map(c => c.name).sort();
      expect(choreNames).toEqual(['Clean Room', 'Do Dishes']);
    });

    it('should return single chore for kid with one assignment', async () => {
      const testData = await setupTestData();

      const result = await getChoresByKidId(testData.kid2.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Take Out Trash');
      expect(result[0].assigned_kid_id).toEqual(testData.kid2.id);
      expect(result[0].point_value).toEqual(5);
      expect(result[0].frequency).toEqual('weekly');
      expect(result[0].status).toEqual('completed_pending_approval');
    });

    it('should return empty array for kid with no chores', async () => {
      await setupTestData();

      // Create a kid with no chores assigned
      const kidResult = await db.insert(usersTable)
        .values({
          name: 'Kid With No Chores',
          role: 'kid',
          points: 0
        })
        .returning()
        .execute();

      const result = await getChoresByKidId(kidResult[0].id);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent kid', async () => {
      await setupTestData();

      const result = await getChoresByKidId(99999);
      expect(result).toHaveLength(0);
    });
  });

  describe('getChoresByParentId', () => {
    it('should return chores created by specific parent', async () => {
      const testData = await setupTestData();

      const result = await getChoresByParentId(testData.parent.id);

      expect(result).toHaveLength(2);
      
      // All returned chores should be created by parent
      result.forEach(chore => {
        expect(chore.created_by_parent_id).toEqual(testData.parent.id);
      });

      // Check specific chores
      const choreNames = result.map(c => c.name).sort();
      expect(choreNames).toEqual(['Clean Room', 'Take Out Trash']);
    });

    it('should return single chore for parent with one creation', async () => {
      const testData = await setupTestData();

      const result = await getChoresByParentId(testData.parent2.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Do Dishes');
      expect(result[0].created_by_parent_id).toEqual(testData.parent2.id);
      expect(result[0].point_value).toEqual(8);
      expect(result[0].frequency).toEqual('daily');
      expect(result[0].status).toEqual('approved');
    });

    it('should return empty array for parent with no chores', async () => {
      await setupTestData();

      // Create a parent with no chores created
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent With No Chores',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();

      const result = await getChoresByParentId(parentResult[0].id);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent parent', async () => {
      await setupTestData();

      const result = await getChoresByParentId(99999);
      expect(result).toHaveLength(0);
    });
  });

  describe('getChoreById', () => {
    it('should return specific chore by ID', async () => {
      const testData = await setupTestData();

      const result = await getChoreById(testData.chore1.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testData.chore1.id);
      expect(result!.name).toEqual('Clean Room');
      expect(result!.point_value).toEqual(10);
      expect(result!.frequency).toEqual('daily');
      expect(result!.assigned_kid_id).toEqual(testData.kid1.id);
      expect(result!.status).toEqual('pending');
      expect(result!.created_by_parent_id).toEqual(testData.parent.id);
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.completed_at).toBeNull();
      expect(result!.approved_at).toBeNull();
    });

    it('should return chore with different status', async () => {
      const testData = await setupTestData();

      const result = await getChoreById(testData.chore2.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testData.chore2.id);
      expect(result!.name).toEqual('Take Out Trash');
      expect(result!.status).toEqual('completed_pending_approval');
      expect(result!.point_value).toEqual(5);
      expect(result!.frequency).toEqual('weekly');
    });

    it('should return null for non-existent chore', async () => {
      await setupTestData();

      const result = await getChoreById(99999);
      expect(result).toBeNull();
    });

    it('should return null when no chores exist', async () => {
      const result = await getChoreById(1);
      expect(result).toBeNull();
    });
  });

  describe('error scenarios', () => {
    it('should handle database queries properly with various chore statuses', async () => {
      const testData = await setupTestData();

      // Update one chore to have completed_at and approved_at timestamps
      const now = new Date();
      await db.update(choresTable)
        .set({
          status: 'approved',
          completed_at: now,
          approved_at: now
        })
        .where(eq(choresTable.id, testData.chore1.id))
        .execute();

      const result = await getChoreById(testData.chore1.id);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual('approved');
      expect(result!.completed_at).toBeInstanceOf(Date);
      expect(result!.approved_at).toBeInstanceOf(Date);
    });

    it('should handle all frequency types correctly', async () => {
      const testData = await setupTestData();

      // Create chore with one_time frequency
      const oneTimeChoreResult = await db.insert(choresTable)
        .values({
          name: 'One Time Task',
          point_value: 15,
          frequency: 'one_time',
          assigned_kid_id: testData.kid1.id,
          status: 'pending',
          created_by_parent_id: testData.parent.id
        })
        .returning()
        .execute();

      const result = await getChoreById(oneTimeChoreResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.frequency).toEqual('one_time');
      expect(result!.point_value).toEqual(15);
    });

    it('should handle all status types correctly', async () => {
      const testData = await setupTestData();

      // Create chore with rejected status
      const rejectedChoreResult = await db.insert(choresTable)
        .values({
          name: 'Rejected Task',
          point_value: 20,
          frequency: 'daily',
          assigned_kid_id: testData.kid1.id,
          status: 'rejected',
          created_by_parent_id: testData.parent.id
        })
        .returning()
        .execute();

      const result = await getChoreById(rejectedChoreResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.status).toEqual('rejected');
      expect(result!.point_value).toEqual(20);
    });
  });
});
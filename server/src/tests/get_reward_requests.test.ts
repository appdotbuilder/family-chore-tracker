import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rewardsTable, rewardRequestsTable } from '../db/schema';
import { 
  getRewardRequests,
  getRewardRequestsByKidId,
  getPendingRewardRequests,
  getRewardRequestById
} from '../handlers/get_reward_requests';

describe('getRewardRequests handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let parentId: number;
  let kidId: number;
  let kid2Id: number;
  let rewardId: number;
  let pendingRequestId: number;
  let approvedRequestId: number;
  let rejectedRequestId: number;

  beforeEach(async () => {
    // Create test users
    const [parent] = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parent.id;

    const [kid] = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();
    kidId = kid.id;

    const [kid2] = await db.insert(usersTable)
      .values({
        name: 'Test Kid 2',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();
    kid2Id = kid2.id;

    // Create test reward
    const [reward] = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 25,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    rewardId = reward.id;

    // Create test reward requests with different statuses
    const [pendingRequest] = await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'pending'
      })
      .returning()
      .execute();
    pendingRequestId = pendingRequest.id;

    const [approvedRequest] = await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kid2Id,
        status: 'approved',
        processed_at: new Date(),
        processed_by_parent_id: parentId
      })
      .returning()
      .execute();
    approvedRequestId = approvedRequest.id;

    const [rejectedRequest] = await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'rejected',
        processed_at: new Date(),
        processed_by_parent_id: parentId
      })
      .returning()
      .execute();
    rejectedRequestId = rejectedRequest.id;
  });

  describe('getRewardRequests', () => {
    it('should fetch all reward requests', async () => {
      const results = await getRewardRequests();

      expect(results).toHaveLength(3);
      expect(results.map(r => r.id).sort()).toEqual([pendingRequestId, approvedRequestId, rejectedRequestId].sort());
      
      // Verify structure of first result
      const firstResult = results[0];
      expect(firstResult.reward_id).toEqual(rewardId);
      expect([kidId, kid2Id]).toContain(firstResult.kid_id);
      expect(['pending', 'approved', 'rejected']).toContain(firstResult.status);
      expect(firstResult.requested_at).toBeInstanceOf(Date);
      expect(firstResult.id).toBeDefined();
    });

    it('should return empty array when no reward requests exist', async () => {
      // Clear all reward requests
      await db.delete(rewardRequestsTable).execute();

      const results = await getRewardRequests();
      expect(results).toHaveLength(0);
    });
  });

  describe('getRewardRequestsByKidId', () => {
    it('should fetch reward requests for specific kid', async () => {
      const results = await getRewardRequestsByKidId(kidId);

      expect(results).toHaveLength(2);
      results.forEach(request => {
        expect(request.kid_id).toEqual(kidId);
        expect(request.reward_id).toEqual(rewardId);
        expect(['pending', 'rejected']).toContain(request.status);
      });
    });

    it('should fetch reward requests for different kid', async () => {
      const results = await getRewardRequestsByKidId(kid2Id);

      expect(results).toHaveLength(1);
      expect(results[0].kid_id).toEqual(kid2Id);
      expect(results[0].status).toEqual('approved');
    });

    it('should return empty array for kid with no reward requests', async () => {
      // Create a new kid with no reward requests
      const [newKid] = await db.insert(usersTable)
        .values({
          name: 'New Kid',
          role: 'kid',
          points: 10
        })
        .returning()
        .execute();

      const results = await getRewardRequestsByKidId(newKid.id);
      expect(results).toHaveLength(0);
    });

    it('should return empty array for non-existent kid ID', async () => {
      const results = await getRewardRequestsByKidId(99999);
      expect(results).toHaveLength(0);
    });
  });

  describe('getPendingRewardRequests', () => {
    it('should fetch only pending reward requests', async () => {
      const results = await getPendingRewardRequests();

      expect(results).toHaveLength(1);
      expect(results[0].id).toEqual(pendingRequestId);
      expect(results[0].status).toEqual('pending');
      expect(results[0].kid_id).toEqual(kidId);
      expect(results[0].reward_id).toEqual(rewardId);
      expect(results[0].processed_at).toBeNull();
      expect(results[0].processed_by_parent_id).toBeNull();
    });

    it('should return empty array when no pending requests exist', async () => {
      // Update all requests to non-pending status
      await db.update(rewardRequestsTable)
        .set({ 
          status: 'approved',
          processed_at: new Date(),
          processed_by_parent_id: parentId
        })
        .execute();

      const results = await getPendingRewardRequests();
      expect(results).toHaveLength(0);
    });

    it('should not return approved or rejected requests', async () => {
      const results = await getPendingRewardRequests();

      expect(results).toHaveLength(1);
      results.forEach(request => {
        expect(request.status).toEqual('pending');
        expect(request.status).not.toEqual('approved');
        expect(request.status).not.toEqual('rejected');
      });
    });
  });

  describe('getRewardRequestById', () => {
    it('should fetch specific reward request by ID', async () => {
      const result = await getRewardRequestById(pendingRequestId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(pendingRequestId);
      expect(result!.reward_id).toEqual(rewardId);
      expect(result!.kid_id).toEqual(kidId);
      expect(result!.status).toEqual('pending');
      expect(result!.requested_at).toBeInstanceOf(Date);
      expect(result!.processed_at).toBeNull();
      expect(result!.processed_by_parent_id).toBeNull();
    });

    it('should fetch approved reward request with complete data', async () => {
      const result = await getRewardRequestById(approvedRequestId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(approvedRequestId);
      expect(result!.status).toEqual('approved');
      expect(result!.processed_at).toBeInstanceOf(Date);
      expect(result!.processed_by_parent_id).toEqual(parentId);
    });

    it('should return null for non-existent reward request ID', async () => {
      const result = await getRewardRequestById(99999);
      expect(result).toBeNull();
    });

    it('should return null for negative ID', async () => {
      const result = await getRewardRequestById(-1);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle zero ID correctly', async () => {
      const result = await getRewardRequestById(0);
      expect(result).toBeNull();
    });

    it('should handle very large ID numbers', async () => {
      // Use a large number that fits within PostgreSQL integer range (2^31 - 1)
      const result = await getRewardRequestById(2147483647);
      expect(result).toBeNull();
    });

    it('should return consistent results across multiple calls', async () => {
      const results1 = await getPendingRewardRequests();
      const results2 = await getPendingRewardRequests();
      
      expect(results1).toHaveLength(results2.length);
      expect(results1[0]?.id).toEqual(results2[0]?.id);
    });
  });
});
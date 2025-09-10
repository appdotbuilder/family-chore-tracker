import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rewardsTable, rewardRequestsTable } from '../db/schema';
import { deleteReward } from '../handlers/delete_reward';
import { eq } from 'drizzle-orm';

describe('deleteReward', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let kidId: number;
  let rewardId: number;

  beforeEach(async () => {
    // Create test parent
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parentResult[0].id;

    // Create test kid
    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();
    kidId = kidResult[0].id;

    // Create test reward
    const rewardResult = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A reward for testing',
        image_url: null,
        point_cost: 50,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    rewardId = rewardResult[0].id;
  });

  it('should successfully delete a reward', async () => {
    await deleteReward(rewardId);

    // Verify reward was deleted
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(0);
  });

  it('should throw error when reward does not exist', async () => {
    await expect(deleteReward(99999)).rejects.toThrow(/reward not found/i);
  });



  it('should throw error when reward has pending requests', async () => {
    // Create a pending reward request
    await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'pending'
      })
      .execute();

    await expect(deleteReward(rewardId)).rejects.toThrow(/cannot delete reward with pending requests/i);

    // Verify reward still exists
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(1);
  });

  it('should allow deletion when reward has only approved requests', async () => {
    // Create an approved reward request
    await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'approved',
        processed_by_parent_id: parentId,
        processed_at: new Date()
      })
      .execute();

    await deleteReward(rewardId);

    // Verify reward was deleted
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(0);
  });

  it('should allow deletion when reward has only rejected requests', async () => {
    // Create a rejected reward request
    await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'rejected',
        processed_by_parent_id: parentId,
        processed_at: new Date()
      })
      .execute();

    await deleteReward(rewardId);

    // Verify reward was deleted
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(0);
  });

  it('should prevent deletion when mixed requests include pending ones', async () => {
    // Create multiple requests with different statuses
    await db.insert(rewardRequestsTable)
      .values([
        {
          reward_id: rewardId,
          kid_id: kidId,
          status: 'approved',
          processed_by_parent_id: parentId,
          processed_at: new Date()
        },
        {
          reward_id: rewardId,
          kid_id: kidId,
          status: 'pending'
        }
      ])
      .execute();

    await expect(deleteReward(rewardId)).rejects.toThrow(/cannot delete reward with pending requests/i);

    // Verify reward still exists
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(1);
  });

  it('should verify proper database cleanup after deletion', async () => {
    // Create approved and rejected requests that should remain after deletion
    await db.insert(rewardRequestsTable)
      .values([
        {
          reward_id: rewardId,
          kid_id: kidId,
          status: 'approved',
          processed_by_parent_id: parentId,
          processed_at: new Date()
        },
        {
          reward_id: rewardId,
          kid_id: kidId,
          status: 'rejected',
          processed_by_parent_id: parentId,
          processed_at: new Date()
        }
      ])
      .execute();

    await deleteReward(rewardId);

    // Verify reward was deleted
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(rewards).toHaveLength(0);

    // Verify associated reward requests still exist (they should not be cascade deleted)
    const requests = await db.select()
      .from(rewardRequestsTable)
      .where(eq(rewardRequestsTable.reward_id, rewardId))
      .execute();

    expect(requests).toHaveLength(2);
  });
});
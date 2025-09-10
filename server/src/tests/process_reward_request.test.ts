import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rewardsTable, rewardRequestsTable, pointTransactionsTable } from '../db/schema';
import { type ProcessRewardRequestInput } from '../schema';
import { processRewardRequest } from '../handlers/process_reward_request';
import { eq } from 'drizzle-orm';

describe('processRewardRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let kidId: number;
  let rewardId: number;
  let requestId: number;

  beforeEach(async () => {
    // Create test users
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parentResult[0].id;

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

    // Create test reward request
    const requestResult = await db.insert(rewardRequestsTable)
      .values({
        reward_id: rewardId,
        kid_id: kidId,
        status: 'pending'
      })
      .returning()
      .execute();
    requestId = requestResult[0].id;
  });

  it('should approve a reward request and deduct points', async () => {
    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: parentId,
      approved: true
    };

    const result = await processRewardRequest(input);

    // Check the returned request
    expect(result.id).toEqual(requestId);
    expect(result.status).toEqual('approved');
    expect(result.processed_by_parent_id).toEqual(parentId);
    expect(result.processed_at).toBeInstanceOf(Date);

    // Verify kid's points were deducted
    const updatedKid = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();
    expect(updatedKid[0].points).toEqual(50); // 100 - 50

    // Verify point transaction was created
    const transactions = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_type).toEqual('reward_redemption');
    expect(transactions[0].points_change).toEqual(-50);
    expect(transactions[0].reference_id).toEqual(requestId);
  });

  it('should reject a reward request without deducting points', async () => {
    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: parentId,
      approved: false
    };

    const result = await processRewardRequest(input);

    // Check the returned request
    expect(result.id).toEqual(requestId);
    expect(result.status).toEqual('rejected');
    expect(result.processed_by_parent_id).toEqual(parentId);
    expect(result.processed_at).toBeInstanceOf(Date);

    // Verify kid's points were not deducted
    const updatedKid = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();
    expect(updatedKid[0].points).toEqual(100); // Original amount

    // Verify no point transaction was created
    const transactions = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();
    expect(transactions).toHaveLength(0);
  });

  it('should throw error if reward request does not exist', async () => {
    const input: ProcessRewardRequestInput = {
      request_id: 99999,
      parent_id: parentId,
      approved: true
    };

    await expect(processRewardRequest(input)).rejects.toThrow(/not found or not in pending status/i);
  });

  it('should throw error if reward request is not in pending status', async () => {
    // Update the request to approved status
    await db.update(rewardRequestsTable)
      .set({ status: 'approved' })
      .where(eq(rewardRequestsTable.id, requestId))
      .execute();

    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: parentId,
      approved: true
    };

    await expect(processRewardRequest(input)).rejects.toThrow(/not found or not in pending status/i);
  });

  it('should throw error if parent does not exist', async () => {
    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: 99999,
      approved: true
    };

    await expect(processRewardRequest(input)).rejects.toThrow(/parent not found/i);
  });

  it('should throw error if user is not a parent', async () => {
    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: kidId, // Using kid ID instead of parent ID
      approved: true
    };

    await expect(processRewardRequest(input)).rejects.toThrow(/not a parent/i);
  });

  it('should throw error if kid does not have enough points', async () => {
    // Update kid to have fewer points than required
    await db.update(usersTable)
      .set({ points: 25 }) // Less than reward cost of 50
      .where(eq(usersTable.id, kidId))
      .execute();

    const input: ProcessRewardRequestInput = {
      request_id: requestId,
      parent_id: parentId,
      approved: true
    };

    await expect(processRewardRequest(input)).rejects.toThrow(/does not have enough points/i);
  });

  it('should handle expensive rewards correctly', async () => {
    // Create an expensive reward
    const expensiveRewardResult = await db.insert(rewardsTable)
      .values({
        name: 'Expensive Reward',
        description: 'Very costly reward',
        image_url: null,
        point_cost: 100,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();

    const expensiveRequestResult = await db.insert(rewardRequestsTable)
      .values({
        reward_id: expensiveRewardResult[0].id,
        kid_id: kidId,
        status: 'pending'
      })
      .returning()
      .execute();

    const input: ProcessRewardRequestInput = {
      request_id: expensiveRequestResult[0].id,
      parent_id: parentId,
      approved: true
    };

    const result = await processRewardRequest(input);

    // Kid should have 0 points left (100 - 100)
    const updatedKid = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();
    expect(updatedKid[0].points).toEqual(0);

    // Point transaction should reflect the full cost
    const transactions = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();
    expect(transactions[0].points_change).toEqual(-100);
  });
});
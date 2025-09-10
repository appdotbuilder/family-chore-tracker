import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rewardsTable, rewardRequestsTable } from '../db/schema';
import { type CreateRewardRequestInput } from '../schema';
import { createRewardRequest } from '../handlers/create_reward_request';
import { eq } from 'drizzle-orm';

describe('createRewardRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a reward request successfully', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create kid user with enough points
    const kid = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();

    // Create reward
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 50,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: kid[0].id
    };

    const result = await createRewardRequest(testInput);

    // Verify the returned reward request
    expect(result.reward_id).toEqual(reward[0].id);
    expect(result.kid_id).toEqual(kid[0].id);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.requested_at).toBeInstanceOf(Date);
    expect(result.processed_at).toBeNull();
    expect(result.processed_by_parent_id).toBeNull();
  });

  it('should save reward request to database', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create kid user with enough points
    const kid = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();

    // Create reward
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 50,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: kid[0].id
    };

    const result = await createRewardRequest(testInput);

    // Verify the record exists in database
    const rewardRequests = await db.select()
      .from(rewardRequestsTable)
      .where(eq(rewardRequestsTable.id, result.id))
      .execute();

    expect(rewardRequests).toHaveLength(1);
    expect(rewardRequests[0].reward_id).toEqual(reward[0].id);
    expect(rewardRequests[0].kid_id).toEqual(kid[0].id);
    expect(rewardRequests[0].status).toEqual('pending');
    expect(rewardRequests[0].requested_at).toBeInstanceOf(Date);
  });

  it('should throw error when reward does not exist', async () => {
    // Create kid user
    const kid = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 100
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: 999, // Non-existent reward ID
      kid_id: kid[0].id
    };

    await expect(createRewardRequest(testInput)).rejects.toThrow(/reward not found/i);
  });

  it('should throw error when kid does not exist', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create reward
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 50,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: 999 // Non-existent kid ID
    };

    await expect(createRewardRequest(testInput)).rejects.toThrow(/kid not found/i);
  });

  it('should throw error when user is not a kid', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create another parent user (not a kid)
    const anotherParent = await db.insert(usersTable)
      .values({
        name: 'Another Parent',
        role: 'parent',
        points: 100
      })
      .returning()
      .execute();

    // Create reward
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 50,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: anotherParent[0].id // Using parent ID instead of kid ID
    };

    await expect(createRewardRequest(testInput)).rejects.toThrow(/only kids can request rewards/i);
  });

  it('should throw error when kid has insufficient points', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create kid user with insufficient points
    const kid = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 25 // Less than required 50 points
      })
      .returning()
      .execute();

    // Create reward that costs more than kid has
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Expensive Reward',
        description: 'A reward that costs more points',
        point_cost: 50,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: kid[0].id
    };

    await expect(createRewardRequest(testInput)).rejects.toThrow(/insufficient points/i);
  });

  it('should handle edge case where kid has exact points needed', async () => {
    // Create parent user
    const parent = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    // Create kid user with exact points needed
    const kid = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 75 // Exact points needed
      })
      .returning()
      .execute();

    // Create reward
    const reward = await db.insert(rewardsTable)
      .values({
        name: 'Test Reward',
        description: 'A test reward',
        point_cost: 75,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const testInput: CreateRewardRequestInput = {
      reward_id: reward[0].id,
      kid_id: kid[0].id
    };

    const result = await createRewardRequest(testInput);

    expect(result.reward_id).toEqual(reward[0].id);
    expect(result.kid_id).toEqual(kid[0].id);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
  });
});
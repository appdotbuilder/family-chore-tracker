import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rewardsTable, usersTable } from '../db/schema';
import { type CreateRewardInput } from '../schema';
import { createReward } from '../handlers/create_reward';
import { eq } from 'drizzle-orm';

// Test data
const parentUser = {
  name: 'Test Parent',
  role: 'parent' as const,
  points: 0
};

const kidUser = {
  name: 'Test Kid',
  role: 'kid' as const,
  points: 50
};

const testRewardInput: CreateRewardInput = {
  name: 'Nintendo Switch',
  description: 'Gaming console for good behavior',
  image_url: 'https://example.com/switch.jpg',
  point_cost: 500,
  created_by_parent_id: 1 // Will be set after creating parent
};

describe('createReward', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a reward successfully', async () => {
    // Create a parent user first
    const [parent] = await db.insert(usersTable)
      .values(parentUser)
      .returning()
      .execute();

    const input = { ...testRewardInput, created_by_parent_id: parent.id };

    const result = await createReward(input);

    // Validate returned reward
    expect(result.id).toBeDefined();
    expect(result.name).toEqual('Nintendo Switch');
    expect(result.description).toEqual('Gaming console for good behavior');
    expect(result.image_url).toEqual('https://example.com/switch.jpg');
    expect(result.point_cost).toEqual(500);
    expect(result.created_by_parent_id).toEqual(parent.id);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save reward to database', async () => {
    // Create a parent user first
    const [parent] = await db.insert(usersTable)
      .values(parentUser)
      .returning()
      .execute();

    const input = { ...testRewardInput, created_by_parent_id: parent.id };

    const result = await createReward(input);

    // Query database to verify persistence
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, result.id))
      .execute();

    expect(rewards).toHaveLength(1);
    expect(rewards[0].name).toEqual('Nintendo Switch');
    expect(rewards[0].description).toEqual('Gaming console for good behavior');
    expect(rewards[0].image_url).toEqual('https://example.com/switch.jpg');
    expect(rewards[0].point_cost).toEqual(500);
    expect(rewards[0].created_by_parent_id).toEqual(parent.id);
    expect(rewards[0].created_at).toBeInstanceOf(Date);
  });

  it('should create reward with nullable fields set to null', async () => {
    // Create a parent user first
    const [parent] = await db.insert(usersTable)
      .values(parentUser)
      .returning()
      .execute();

    const minimalInput: CreateRewardInput = {
      name: 'Simple Reward',
      description: null,
      image_url: null,
      point_cost: 100,
      created_by_parent_id: parent.id
    };

    const result = await createReward(minimalInput);

    expect(result.name).toEqual('Simple Reward');
    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.point_cost).toEqual(100);
    expect(result.created_by_parent_id).toEqual(parent.id);
  });

  it('should throw error when parent does not exist', async () => {
    const input = { ...testRewardInput, created_by_parent_id: 999 };

    await expect(createReward(input)).rejects.toThrow(/parent not found/i);
  });

  it('should throw error when user is not a parent', async () => {
    // Create a kid user instead of parent
    const [kid] = await db.insert(usersTable)
      .values(kidUser)
      .returning()
      .execute();

    const input = { ...testRewardInput, created_by_parent_id: kid.id };

    await expect(createReward(input)).rejects.toThrow(/only parents can create rewards/i);
  });

  it('should create multiple rewards for same parent', async () => {
    // Create a parent user
    const [parent] = await db.insert(usersTable)
      .values(parentUser)
      .returning()
      .execute();

    const input1 = { ...testRewardInput, created_by_parent_id: parent.id };
    const input2 = {
      name: 'Ice Cream Trip',
      description: 'Trip to get favorite ice cream',
      image_url: null,
      point_cost: 50,
      created_by_parent_id: parent.id
    };

    const reward1 = await createReward(input1);
    const reward2 = await createReward(input2);

    expect(reward1.id).not.toEqual(reward2.id);
    expect(reward1.name).toEqual('Nintendo Switch');
    expect(reward2.name).toEqual('Ice Cream Trip');
    expect(reward1.created_by_parent_id).toEqual(parent.id);
    expect(reward2.created_by_parent_id).toEqual(parent.id);

    // Verify both are in database
    const rewards = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.created_by_parent_id, parent.id))
      .execute();

    expect(rewards).toHaveLength(2);
  });

  it('should handle rewards with different point costs', async () => {
    // Create a parent user
    const [parent] = await db.insert(usersTable)
      .values(parentUser)
      .returning()
      .execute();

    const expensiveReward = {
      name: 'Expensive Reward',
      description: 'High point cost reward',
      image_url: null,
      point_cost: 1000,
      created_by_parent_id: parent.id
    };

    const cheapReward = {
      name: 'Cheap Reward',
      description: 'Low point cost reward',
      image_url: null,
      point_cost: 1,
      created_by_parent_id: parent.id
    };

    const result1 = await createReward(expensiveReward);
    const result2 = await createReward(cheapReward);

    expect(result1.point_cost).toEqual(1000);
    expect(result2.point_cost).toEqual(1);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rewardsTable, usersTable } from '../db/schema';
import { type UpdateRewardInput } from '../schema';
import { updateReward } from '../handlers/update_reward';
import { eq } from 'drizzle-orm';

describe('updateReward', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test parent user and reward for each test
  let parentId: number;
  let rewardId: number;

  beforeEach(async () => {
    // Create a parent user
    const parentResult = await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();
    parentId = parentResult[0].id;

    // Create a test reward
    const rewardResult = await db.insert(rewardsTable)
      .values({
        name: 'Original Reward',
        description: 'Original description',
        image_url: 'http://example.com/original.jpg',
        point_cost: 100,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    rewardId = rewardResult[0].id;
  });

  it('should update all fields when provided', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      name: 'Updated Reward',
      description: 'Updated description',
      image_url: 'http://example.com/updated.jpg',
      point_cost: 150
    };

    const result = await updateReward(updateInput);

    expect(result.id).toEqual(rewardId);
    expect(result.name).toEqual('Updated Reward');
    expect(result.description).toEqual('Updated description');
    expect(result.image_url).toEqual('http://example.com/updated.jpg');
    expect(result.point_cost).toEqual(150);
    expect(result.created_by_parent_id).toEqual(parentId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only name when only name is provided', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      name: 'New Name Only'
    };

    const result = await updateReward(updateInput);

    expect(result.name).toEqual('New Name Only');
    expect(result.description).toEqual('Original description');
    expect(result.image_url).toEqual('http://example.com/original.jpg');
    expect(result.point_cost).toEqual(100);
  });

  it('should update only point_cost when only point_cost is provided', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      point_cost: 200
    };

    const result = await updateReward(updateInput);

    expect(result.name).toEqual('Original Reward');
    expect(result.description).toEqual('Original description');
    expect(result.image_url).toEqual('http://example.com/original.jpg');
    expect(result.point_cost).toEqual(200);
  });

  it('should handle nullable fields correctly when setting to null', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      description: null,
      image_url: null
    };

    const result = await updateReward(updateInput);

    expect(result.name).toEqual('Original Reward');
    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
    expect(result.point_cost).toEqual(100);
  });

  it('should handle nullable fields correctly when setting to non-null values', async () => {
    // First set fields to null
    await db.update(rewardsTable)
      .set({
        description: null,
        image_url: null
      })
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    const updateInput: UpdateRewardInput = {
      id: rewardId,
      description: 'Now has description',
      image_url: 'http://example.com/now-has-image.jpg'
    };

    const result = await updateReward(updateInput);

    expect(result.description).toEqual('Now has description');
    expect(result.image_url).toEqual('http://example.com/now-has-image.jpg');
  });

  it('should save changes to database', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      name: 'Database Test Reward',
      point_cost: 250
    };

    await updateReward(updateInput);

    // Verify changes were saved to database
    const dbReward = await db.select()
      .from(rewardsTable)
      .where(eq(rewardsTable.id, rewardId))
      .execute();

    expect(dbReward).toHaveLength(1);
    expect(dbReward[0].name).toEqual('Database Test Reward');
    expect(dbReward[0].point_cost).toEqual(250);
    expect(dbReward[0].description).toEqual('Original description'); // Unchanged
    expect(dbReward[0].image_url).toEqual('http://example.com/original.jpg'); // Unchanged
  });

  it('should throw error when reward does not exist', async () => {
    const updateInput: UpdateRewardInput = {
      id: 99999, // Non-existent ID
      name: 'Should Fail'
    };

    await expect(updateReward(updateInput)).rejects.toThrow(/reward with id 99999 not found/i);
  });

  it('should update multiple fields selectively', async () => {
    const updateInput: UpdateRewardInput = {
      id: rewardId,
      name: 'Partial Update',
      point_cost: 75
      // description and image_url not provided - should remain unchanged
    };

    const result = await updateReward(updateInput);

    expect(result.name).toEqual('Partial Update');
    expect(result.point_cost).toEqual(75);
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.image_url).toEqual('http://example.com/original.jpg'); // Unchanged
  });
});
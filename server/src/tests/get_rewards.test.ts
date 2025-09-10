import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, rewardsTable } from '../db/schema';
import { getRewards, getRewardsByParentId, getRewardById } from '../handlers/get_rewards';

describe('get_rewards handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getRewards', () => {
    it('should return empty array when no rewards exist', async () => {
      const result = await getRewards();
      expect(result).toEqual([]);
    });

    it('should return all rewards', async () => {
      // Create a parent user first
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent User',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parentId = parentResult[0].id;

      // Create test rewards
      await db.insert(rewardsTable)
        .values([
          {
            name: 'Reward 1',
            description: 'First reward',
            image_url: 'http://example.com/reward1.jpg',
            point_cost: 10,
            created_by_parent_id: parentId
          },
          {
            name: 'Reward 2',
            description: null,
            image_url: null,
            point_cost: 25,
            created_by_parent_id: parentId
          }
        ])
        .execute();

      const result = await getRewards();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Reward 1');
      expect(result[0].description).toEqual('First reward');
      expect(result[0].image_url).toEqual('http://example.com/reward1.jpg');
      expect(result[0].point_cost).toEqual(10);
      expect(result[0].created_by_parent_id).toEqual(parentId);
      expect(result[0].created_at).toBeInstanceOf(Date);

      expect(result[1].name).toEqual('Reward 2');
      expect(result[1].description).toBeNull();
      expect(result[1].image_url).toBeNull();
      expect(result[1].point_cost).toEqual(25);
    });

    it('should return rewards from multiple parents', async () => {
      // Create two parent users
      const parent1Result = await db.insert(usersTable)
        .values({
          name: 'Parent 1',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();

      const parent2Result = await db.insert(usersTable)
        .values({
          name: 'Parent 2',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parent1Id = parent1Result[0].id;
      const parent2Id = parent2Result[0].id;

      // Create rewards for both parents
      await db.insert(rewardsTable)
        .values([
          {
            name: 'Parent 1 Reward',
            description: 'From parent 1',
            image_url: null,
            point_cost: 15,
            created_by_parent_id: parent1Id
          },
          {
            name: 'Parent 2 Reward',
            description: 'From parent 2',
            image_url: null,
            point_cost: 20,
            created_by_parent_id: parent2Id
          }
        ])
        .execute();

      const result = await getRewards();
      
      expect(result).toHaveLength(2);
      const rewardNames = result.map(r => r.name);
      expect(rewardNames).toContain('Parent 1 Reward');
      expect(rewardNames).toContain('Parent 2 Reward');
    });
  });

  describe('getRewardsByParentId', () => {
    it('should return empty array when parent has no rewards', async () => {
      // Create a parent user
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent User',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parentId = parentResult[0].id;

      const result = await getRewardsByParentId(parentId);
      expect(result).toEqual([]);
    });

    it('should return only rewards created by specific parent', async () => {
      // Create two parent users
      const parent1Result = await db.insert(usersTable)
        .values({
          name: 'Parent 1',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();

      const parent2Result = await db.insert(usersTable)
        .values({
          name: 'Parent 2',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parent1Id = parent1Result[0].id;
      const parent2Id = parent2Result[0].id;

      // Create rewards for both parents
      await db.insert(rewardsTable)
        .values([
          {
            name: 'Parent 1 Reward A',
            description: 'First reward from parent 1',
            image_url: null,
            point_cost: 15,
            created_by_parent_id: parent1Id
          },
          {
            name: 'Parent 1 Reward B',
            description: 'Second reward from parent 1',
            image_url: null,
            point_cost: 30,
            created_by_parent_id: parent1Id
          },
          {
            name: 'Parent 2 Reward',
            description: 'Reward from parent 2',
            image_url: null,
            point_cost: 20,
            created_by_parent_id: parent2Id
          }
        ])
        .execute();

      const result = await getRewardsByParentId(parent1Id);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.created_by_parent_id === parent1Id)).toBe(true);
      
      const rewardNames = result.map(r => r.name);
      expect(rewardNames).toContain('Parent 1 Reward A');
      expect(rewardNames).toContain('Parent 1 Reward B');
      expect(rewardNames).not.toContain('Parent 2 Reward');
    });

    it('should return rewards with all field types correctly', async () => {
      // Create a parent user
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent User',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parentId = parentResult[0].id;

      // Create a reward with all nullable fields populated
      await db.insert(rewardsTable)
        .values({
          name: 'Complete Reward',
          description: 'A reward with all fields',
          image_url: 'http://example.com/complete.jpg',
          point_cost: 50,
          created_by_parent_id: parentId
        })
        .execute();

      const result = await getRewardsByParentId(parentId);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Complete Reward');
      expect(result[0].description).toEqual('A reward with all fields');
      expect(result[0].image_url).toEqual('http://example.com/complete.jpg');
      expect(result[0].point_cost).toEqual(50);
      expect(result[0].id).toBeDefined();
      expect(result[0].created_at).toBeInstanceOf(Date);
    });

    it('should return empty array for non-existent parent', async () => {
      const result = await getRewardsByParentId(999);
      expect(result).toEqual([]);
    });
  });

  describe('getRewardById', () => {
    it('should return null when reward does not exist', async () => {
      const result = await getRewardById(999);
      expect(result).toBeNull();
    });

    it('should return specific reward by ID', async () => {
      // Create a parent user
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent User',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parentId = parentResult[0].id;

      // Create test rewards
      const rewardResults = await db.insert(rewardsTable)
        .values([
          {
            name: 'Reward 1',
            description: 'First reward',
            image_url: 'http://example.com/reward1.jpg',
            point_cost: 10,
            created_by_parent_id: parentId
          },
          {
            name: 'Reward 2',
            description: 'Second reward',
            image_url: null,
            point_cost: 25,
            created_by_parent_id: parentId
          }
        ])
        .returning()
        .execute();

      const targetRewardId = rewardResults[1].id;
      const result = await getRewardById(targetRewardId);
      
      expect(result).not.toBeNull();
      expect(result!.id).toEqual(targetRewardId);
      expect(result!.name).toEqual('Reward 2');
      expect(result!.description).toEqual('Second reward');
      expect(result!.image_url).toBeNull();
      expect(result!.point_cost).toEqual(25);
      expect(result!.created_by_parent_id).toEqual(parentId);
      expect(result!.created_at).toBeInstanceOf(Date);
    });

    it('should return reward with null fields correctly', async () => {
      // Create a parent user
      const parentResult = await db.insert(usersTable)
        .values({
          name: 'Parent User',
          role: 'parent',
          points: 0
        })
        .returning()
        .execute();
      
      const parentId = parentResult[0].id;

      // Create reward with null optional fields
      const rewardResults = await db.insert(rewardsTable)
        .values({
          name: 'Minimal Reward',
          description: null,
          image_url: null,
          point_cost: 5,
          created_by_parent_id: parentId
        })
        .returning()
        .execute();

      const rewardId = rewardResults[0].id;
      const result = await getRewardById(rewardId);
      
      expect(result).not.toBeNull();
      expect(result!.name).toEqual('Minimal Reward');
      expect(result!.description).toBeNull();
      expect(result!.image_url).toBeNull();
      expect(result!.point_cost).toEqual(5);
    });
  });
});
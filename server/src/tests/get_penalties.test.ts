import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, penaltiesTable } from '../db/schema';
import { getPenalties, getPenaltiesByParentId, getPenaltyById } from '../handlers/get_penalties';

describe('getPenalties', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no penalties exist', async () => {
    const result = await getPenalties();
    expect(result).toEqual([]);
  });

  it('should return all penalties', async () => {
    // Create test parent users
    const parent1 = await db.insert(usersTable)
      .values({ name: 'Parent One', role: 'parent', points: 0 })
      .returning()
      .execute();

    const parent2 = await db.insert(usersTable)
      .values({ name: 'Parent Two', role: 'parent', points: 0 })
      .returning()
      .execute();

    // Create test penalties
    await db.insert(penaltiesTable)
      .values([
        {
          name: 'Late Bedtime',
          description: 'Going to bed past bedtime',
          point_deduction: 5,
          created_by_parent_id: parent1[0].id
        },
        {
          name: 'Not Cleaning Room',
          description: 'Leaving room messy',
          point_deduction: 10,
          created_by_parent_id: parent2[0].id
        },
        {
          name: 'Talking Back',
          description: null,
          point_deduction: 15,
          created_by_parent_id: parent1[0].id
        }
      ])
      .execute();

    const result = await getPenalties();

    expect(result).toHaveLength(3);
    
    // Check penalty fields
    const penalty1 = result.find(p => p.name === 'Late Bedtime');
    expect(penalty1).toBeDefined();
    expect(penalty1!.description).toEqual('Going to bed past bedtime');
    expect(penalty1!.point_deduction).toEqual(5);
    expect(penalty1!.created_by_parent_id).toEqual(parent1[0].id);
    expect(penalty1!.id).toBeDefined();
    expect(penalty1!.created_at).toBeInstanceOf(Date);

    const penalty2 = result.find(p => p.name === 'Not Cleaning Room');
    expect(penalty2).toBeDefined();
    expect(penalty2!.description).toEqual('Leaving room messy');
    expect(penalty2!.point_deduction).toEqual(10);
    expect(penalty2!.created_by_parent_id).toEqual(parent2[0].id);

    const penalty3 = result.find(p => p.name === 'Talking Back');
    expect(penalty3).toBeDefined();
    expect(penalty3!.description).toBeNull();
    expect(penalty3!.point_deduction).toEqual(15);
    expect(penalty3!.created_by_parent_id).toEqual(parent1[0].id);
  });
});

describe('getPenaltiesByParentId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when parent has no penalties', async () => {
    // Create test parent
    const parent = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();

    const result = await getPenaltiesByParentId(parent[0].id);
    expect(result).toEqual([]);
  });

  it('should return only penalties created by specified parent', async () => {
    // Create test parent users
    const parent1 = await db.insert(usersTable)
      .values({ name: 'Parent One', role: 'parent', points: 0 })
      .returning()
      .execute();

    const parent2 = await db.insert(usersTable)
      .values({ name: 'Parent Two', role: 'parent', points: 0 })
      .returning()
      .execute();

    // Create penalties for both parents
    await db.insert(penaltiesTable)
      .values([
        {
          name: 'Parent 1 Penalty 1',
          description: 'First penalty by parent 1',
          point_deduction: 5,
          created_by_parent_id: parent1[0].id
        },
        {
          name: 'Parent 2 Penalty',
          description: 'Penalty by parent 2',
          point_deduction: 8,
          created_by_parent_id: parent2[0].id
        },
        {
          name: 'Parent 1 Penalty 2',
          description: 'Second penalty by parent 1',
          point_deduction: 12,
          created_by_parent_id: parent1[0].id
        }
      ])
      .execute();

    const result = await getPenaltiesByParentId(parent1[0].id);

    expect(result).toHaveLength(2);
    expect(result.every(p => p.created_by_parent_id === parent1[0].id)).toBe(true);

    const penalty1 = result.find(p => p.name === 'Parent 1 Penalty 1');
    expect(penalty1).toBeDefined();
    expect(penalty1!.point_deduction).toEqual(5);

    const penalty2 = result.find(p => p.name === 'Parent 1 Penalty 2');
    expect(penalty2).toBeDefined();
    expect(penalty2!.point_deduction).toEqual(12);
  });

  it('should return empty array for non-existent parent', async () => {
    const result = await getPenaltiesByParentId(999);
    expect(result).toEqual([]);
  });
});

describe('getPenaltyById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when penalty does not exist', async () => {
    const result = await getPenaltyById(999);
    expect(result).toBeNull();
  });

  it('should return penalty when it exists', async () => {
    // Create test parent
    const parent = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();

    // Create test penalty
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Test Penalty',
        description: 'A penalty for testing',
        point_deduction: 7,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const result = await getPenaltyById(penalty[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(penalty[0].id);
    expect(result!.name).toEqual('Test Penalty');
    expect(result!.description).toEqual('A penalty for testing');
    expect(result!.point_deduction).toEqual(7);
    expect(result!.created_by_parent_id).toEqual(parent[0].id);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return penalty with null description', async () => {
    // Create test parent
    const parent = await db.insert(usersTable)
      .values({ name: 'Test Parent', role: 'parent', points: 0 })
      .returning()
      .execute();

    // Create penalty with null description
    const penalty = await db.insert(penaltiesTable)
      .values({
        name: 'Simple Penalty',
        description: null,
        point_deduction: 3,
        created_by_parent_id: parent[0].id
      })
      .returning()
      .execute();

    const result = await getPenaltyById(penalty[0].id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Simple Penalty');
    expect(result!.description).toBeNull();
    expect(result!.point_deduction).toEqual(3);
  });
});
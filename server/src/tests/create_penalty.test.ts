import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, penaltiesTable } from '../db/schema';
import { type CreatePenaltyInput } from '../schema';
import { createPenalty } from '../handlers/create_penalty';
import { eq } from 'drizzle-orm';

// Test input for creating penalty
const testInput: CreatePenaltyInput = {
  name: 'Test Penalty',
  description: 'A penalty for testing',
  point_deduction: 10,
  created_by_parent_id: 1
};

describe('createPenalty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a penalty with valid parent', async () => {
    // First create a parent user
    await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .execute();

    const result = await createPenalty(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Penalty');
    expect(result.description).toEqual('A penalty for testing');
    expect(result.point_deduction).toEqual(10);
    expect(result.created_by_parent_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save penalty to database', async () => {
    // First create a parent user
    await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .execute();

    const result = await createPenalty(testInput);

    // Query database to verify penalty was saved
    const penalties = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, result.id))
      .execute();

    expect(penalties).toHaveLength(1);
    expect(penalties[0].name).toEqual('Test Penalty');
    expect(penalties[0].description).toEqual('A penalty for testing');
    expect(penalties[0].point_deduction).toEqual(10);
    expect(penalties[0].created_by_parent_id).toEqual(1);
    expect(penalties[0].created_at).toBeInstanceOf(Date);
  });

  it('should create penalty with null description', async () => {
    // First create a parent user
    await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .execute();

    const inputWithNullDescription: CreatePenaltyInput = {
      name: 'No Description Penalty',
      description: null,
      point_deduction: 5,
      created_by_parent_id: 1
    };

    const result = await createPenalty(inputWithNullDescription);

    expect(result.name).toEqual('No Description Penalty');
    expect(result.description).toBeNull();
    expect(result.point_deduction).toEqual(5);
  });

  it('should throw error when parent does not exist', async () => {
    const inputWithNonExistentParent: CreatePenaltyInput = {
      name: 'Test Penalty',
      description: 'A penalty for testing',
      point_deduction: 10,
      created_by_parent_id: 999 // Non-existent parent ID
    };

    await expect(createPenalty(inputWithNonExistentParent))
      .rejects.toThrow(/parent not found/i);
  });

  it('should throw error when user is not a parent', async () => {
    // Create a kid user instead of parent
    await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 50
      })
      .execute();

    const inputWithKidAsCreator: CreatePenaltyInput = {
      name: 'Test Penalty',
      description: 'A penalty for testing',
      point_deduction: 10,
      created_by_parent_id: 1 // This is a kid, not a parent
    };

    await expect(createPenalty(inputWithKidAsCreator))
      .rejects.toThrow(/only parents can create penalties/i);
  });

  it('should create multiple penalties for same parent', async () => {
    // First create a parent user
    await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .execute();

    const penalty1Input: CreatePenaltyInput = {
      name: 'First Penalty',
      description: 'First penalty description',
      point_deduction: 5,
      created_by_parent_id: 1
    };

    const penalty2Input: CreatePenaltyInput = {
      name: 'Second Penalty',
      description: 'Second penalty description',
      point_deduction: 15,
      created_by_parent_id: 1
    };

    const result1 = await createPenalty(penalty1Input);
    const result2 = await createPenalty(penalty2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('First Penalty');
    expect(result2.name).toEqual('Second Penalty');
    expect(result1.created_by_parent_id).toEqual(1);
    expect(result2.created_by_parent_id).toEqual(1);

    // Verify both penalties are in database
    const penalties = await db.select()
      .from(penaltiesTable)
      .execute();

    expect(penalties).toHaveLength(2);
  });

  it('should handle high point deduction values', async () => {
    // First create a parent user
    await db.insert(usersTable)
      .values({
        name: 'Test Parent',
        role: 'parent',
        points: 0
      })
      .execute();

    const highDeductionInput: CreatePenaltyInput = {
      name: 'Severe Penalty',
      description: 'A penalty with high point deduction',
      point_deduction: 100,
      created_by_parent_id: 1
    };

    const result = await createPenalty(highDeductionInput);

    expect(result.point_deduction).toEqual(100);
    expect(result.name).toEqual('Severe Penalty');
  });
});
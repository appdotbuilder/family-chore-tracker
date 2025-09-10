import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, penaltiesTable } from '../db/schema';
import { type UpdatePenaltyInput } from '../schema';
import { updatePenalty } from '../handlers/update_penalty';
import { eq } from 'drizzle-orm';

describe('updatePenalty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let penaltyId: number;

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

    // Create a penalty to update
    const penaltyResult = await db.insert(penaltiesTable)
      .values({
        name: 'Original Penalty',
        description: 'Original description',
        point_deduction: 5,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    penaltyId = penaltyResult[0].id;
  });

  it('should update penalty name only', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      name: 'Updated Penalty Name'
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Updated Penalty Name');
    expect(result.description).toEqual('Original description');
    expect(result.point_deduction).toEqual(5);
    expect(result.created_by_parent_id).toEqual(parentId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update penalty description only', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      description: 'Updated description'
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Original Penalty');
    expect(result.description).toEqual('Updated description');
    expect(result.point_deduction).toEqual(5);
    expect(result.created_by_parent_id).toEqual(parentId);
  });

  it('should update penalty point deduction only', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      point_deduction: 15
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Original Penalty');
    expect(result.description).toEqual('Original description');
    expect(result.point_deduction).toEqual(15);
    expect(result.created_by_parent_id).toEqual(parentId);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      name: 'Completely Updated Penalty',
      description: 'Completely updated description',
      point_deduction: 25
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Completely Updated Penalty');
    expect(result.description).toEqual('Completely updated description');
    expect(result.point_deduction).toEqual(25);
    expect(result.created_by_parent_id).toEqual(parentId);
  });

  it('should set description to null when explicitly provided', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      description: null
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Original Penalty');
    expect(result.description).toBeNull();
    expect(result.point_deduction).toEqual(5);
    expect(result.created_by_parent_id).toEqual(parentId);
  });

  it('should return unchanged penalty when no update fields provided', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId
    };

    const result = await updatePenalty(input);

    expect(result.id).toEqual(penaltyId);
    expect(result.name).toEqual('Original Penalty');
    expect(result.description).toEqual('Original description');
    expect(result.point_deduction).toEqual(5);
    expect(result.created_by_parent_id).toEqual(parentId);
  });

  it('should save updated penalty to database', async () => {
    const input: UpdatePenaltyInput = {
      id: penaltyId,
      name: 'Database Test Penalty',
      point_deduction: 20
    };

    await updatePenalty(input);

    // Verify the penalty was updated in the database
    const penalties = await db.select()
      .from(penaltiesTable)
      .where(eq(penaltiesTable.id, penaltyId))
      .execute();

    expect(penalties).toHaveLength(1);
    expect(penalties[0].name).toEqual('Database Test Penalty');
    expect(penalties[0].point_deduction).toEqual(20);
    expect(penalties[0].description).toEqual('Original description');
  });

  it('should throw error when penalty does not exist', async () => {
    const input: UpdatePenaltyInput = {
      id: 99999,
      name: 'Non-existent Penalty'
    };

    expect(updatePenalty(input)).rejects.toThrow(/penalty with id 99999 not found/i);
  });

  it('should handle penalty with null description originally', async () => {
    // Create penalty with null description
    const penaltyWithNullDesc = await db.insert(penaltiesTable)
      .values({
        name: 'Penalty with null desc',
        description: null,
        point_deduction: 10,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();

    const input: UpdatePenaltyInput = {
      id: penaltyWithNullDesc[0].id,
      name: 'Updated Name Only'
    };

    const result = await updatePenalty(input);

    expect(result.name).toEqual('Updated Name Only');
    expect(result.description).toBeNull();
    expect(result.point_deduction).toEqual(10);
  });
});
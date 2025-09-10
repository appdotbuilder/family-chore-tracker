import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  penaltiesTable, 
  penaltyApplicationsTable, 
  pointTransactionsTable 
} from '../db/schema';
import { type ApplyPenaltyInput } from '../schema';
import { applyPenalty } from '../handlers/apply_penalty';
import { eq } from 'drizzle-orm';

describe('applyPenalty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let parentId: number;
  let kidId: number;
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

    // Create a kid user with some points
    const kidResult = await db.insert(usersTable)
      .values({
        name: 'Test Kid',
        role: 'kid',
        points: 50
      })
      .returning()
      .execute();
    kidId = kidResult[0].id;

    // Create a penalty
    const penaltyResult = await db.insert(penaltiesTable)
      .values({
        name: 'Test Penalty',
        description: 'A test penalty',
        point_deduction: 15,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();
    penaltyId = penaltyResult[0].id;
  });

  it('should apply penalty successfully', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    const result = await applyPenalty(input);

    // Verify penalty application record
    expect(result.penalty_id).toBe(penaltyId);
    expect(result.kid_id).toBe(kidId);
    expect(result.applied_by_parent_id).toBe(parentId);
    expect(result.points_deducted).toBe(15);
    expect(result.id).toBeDefined();
    expect(result.applied_at).toBeInstanceOf(Date);
  });

  it('should deduct points from kid balance', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    await applyPenalty(input);

    // Verify kid's points were deducted
    const kids = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();

    expect(kids[0].points).toBe(35); // 50 - 15 = 35
  });

  it('should allow points to go negative', async () => {
    // Update kid to have fewer points
    await db.update(usersTable)
      .set({ points: 5 })
      .where(eq(usersTable.id, kidId))
      .execute();

    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    await applyPenalty(input);

    // Verify kid's points went negative
    const kids = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();

    expect(kids[0].points).toBe(-10); // 5 - 15 = -10
  });

  it('should create penalty application record in database', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    const result = await applyPenalty(input);

    // Verify record exists in database
    const penaltyApplications = await db.select()
      .from(penaltyApplicationsTable)
      .where(eq(penaltyApplicationsTable.id, result.id))
      .execute();

    expect(penaltyApplications).toHaveLength(1);
    expect(penaltyApplications[0].penalty_id).toBe(penaltyId);
    expect(penaltyApplications[0].kid_id).toBe(kidId);
    expect(penaltyApplications[0].applied_by_parent_id).toBe(parentId);
    expect(penaltyApplications[0].points_deducted).toBe(15);
  });

  it('should create point transaction record', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    const result = await applyPenalty(input);

    // Verify point transaction was created
    const transactions = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.reference_id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].kid_id).toBe(kidId);
    expect(transactions[0].transaction_type).toBe('penalty_application');
    expect(transactions[0].points_change).toBe(-15); // Negative for deduction
    expect(transactions[0].reference_id).toBe(result.id);
  });

  it('should throw error if penalty not found', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: 999, // Non-existent penalty
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    expect(applyPenalty(input)).rejects.toThrow(/penalty not found/i);
  });

  it('should throw error if kid not found', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: 999, // Non-existent kid
      applied_by_parent_id: parentId
    };

    expect(applyPenalty(input)).rejects.toThrow(/kid not found/i);
  });

  it('should throw error if parent not found', async () => {
    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: 999 // Non-existent parent
    };

    expect(applyPenalty(input)).rejects.toThrow(/parent not found/i);
  });

  it('should throw error if user is not a kid', async () => {
    // Create another parent to use as kid_id
    const anotherParentResult = await db.insert(usersTable)
      .values({
        name: 'Another Parent',
        role: 'parent',
        points: 0
      })
      .returning()
      .execute();

    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: anotherParentResult[0].id, // Using parent as kid
      applied_by_parent_id: parentId
    };

    expect(applyPenalty(input)).rejects.toThrow(/user is not a kid/i);
  });

  it('should throw error if user is not a parent', async () => {
    // Create another kid to use as parent_id
    const anotherKidResult = await db.insert(usersTable)
      .values({
        name: 'Another Kid',
        role: 'kid',
        points: 20
      })
      .returning()
      .execute();

    const input: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: anotherKidResult[0].id // Using kid as parent
    };

    expect(applyPenalty(input)).rejects.toThrow(/user is not a parent/i);
  });

  it('should handle multiple penalty applications for same kid', async () => {
    // Apply first penalty
    const firstInput: ApplyPenaltyInput = {
      penalty_id: penaltyId,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    await applyPenalty(firstInput);

    // Create another penalty
    const secondPenaltyResult = await db.insert(penaltiesTable)
      .values({
        name: 'Second Penalty',
        description: 'Another test penalty',
        point_deduction: 10,
        created_by_parent_id: parentId
      })
      .returning()
      .execute();

    // Apply second penalty
    const secondInput: ApplyPenaltyInput = {
      penalty_id: secondPenaltyResult[0].id,
      kid_id: kidId,
      applied_by_parent_id: parentId
    };

    await applyPenalty(secondInput);

    // Verify kid's points were deducted twice
    const kids = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, kidId))
      .execute();

    expect(kids[0].points).toBe(25); // 50 - 15 - 10 = 25

    // Verify both penalty applications exist
    const penaltyApplications = await db.select()
      .from(penaltyApplicationsTable)
      .where(eq(penaltyApplicationsTable.kid_id, kidId))
      .execute();

    expect(penaltyApplications).toHaveLength(2);

    // Verify both point transactions exist
    const transactions = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .execute();

    expect(transactions).toHaveLength(2);
    expect(transactions[0].points_change).toBe(-15);
    expect(transactions[1].points_change).toBe(-10);
  });
});
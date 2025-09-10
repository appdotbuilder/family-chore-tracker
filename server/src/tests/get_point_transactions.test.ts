import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, pointTransactionsTable } from '../db/schema';
import { getPointTransactions, getPointTransactionsByKidId } from '../handlers/get_point_transactions';

describe('getPointTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getPointTransactions();
    expect(result).toEqual([]);
  });

  it('should fetch all point transactions ordered by created_at desc', async () => {
    // Create test users
    const [kid1, kid2] = await db.insert(usersTable)
      .values([
        { name: 'Kid 1', role: 'kid', points: 0 },
        { name: 'Kid 2', role: 'kid', points: 0 }
      ])
      .returning()
      .execute();

    // Create test transactions with different timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(pointTransactionsTable)
      .values([
        {
          kid_id: kid1.id,
          transaction_type: 'chore_completion',
          points_change: 10,
          reference_id: 1,
          created_at: yesterday
        },
        {
          kid_id: kid2.id,
          transaction_type: 'reward_redemption',
          points_change: -5,
          reference_id: 2,
          created_at: now
        },
        {
          kid_id: kid1.id,
          transaction_type: 'penalty_application',
          points_change: -3,
          reference_id: 3,
          created_at: tomorrow
        }
      ])
      .execute();

    const result = await getPointTransactions();

    expect(result).toHaveLength(3);
    
    // Verify ordering (most recent first)
    expect(result[0].points_change).toEqual(-3);
    expect(result[0].transaction_type).toEqual('penalty_application');
    expect(result[0].kid_id).toEqual(kid1.id);
    
    expect(result[1].points_change).toEqual(-5);
    expect(result[1].transaction_type).toEqual('reward_redemption');
    expect(result[1].kid_id).toEqual(kid2.id);
    
    expect(result[2].points_change).toEqual(10);
    expect(result[2].transaction_type).toEqual('chore_completion');
    expect(result[2].kid_id).toEqual(kid1.id);

    // Verify all required fields are present
    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.kid_id).toBeDefined();
      expect(transaction.transaction_type).toBeDefined();
      expect(transaction.points_change).toBeDefined();
      expect(transaction.reference_id).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(typeof transaction.points_change).toBe('number');
    });
  });

  it('should handle transactions from multiple kids', async () => {
    // Create test kids
    const [kid1, kid2, kid3] = await db.insert(usersTable)
      .values([
        { name: 'Kid 1', role: 'kid', points: 0 },
        { name: 'Kid 2', role: 'kid', points: 0 },
        { name: 'Kid 3', role: 'kid', points: 0 }
      ])
      .returning()
      .execute();

    // Create transactions for different kids
    await db.insert(pointTransactionsTable)
      .values([
        {
          kid_id: kid1.id,
          transaction_type: 'chore_completion',
          points_change: 15,
          reference_id: 1
        },
        {
          kid_id: kid2.id,
          transaction_type: 'reward_redemption',
          points_change: -8,
          reference_id: 2
        },
        {
          kid_id: kid3.id,
          transaction_type: 'penalty_application',
          points_change: -2,
          reference_id: 3
        }
      ])
      .execute();

    const result = await getPointTransactions();

    expect(result).toHaveLength(3);
    
    // Verify we get transactions from all kids
    const kidIds = result.map(t => t.kid_id).sort();
    expect(kidIds).toEqual([kid1.id, kid2.id, kid3.id].sort());
  });
});

describe('getPointTransactionsByKidId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when kid has no transactions', async () => {
    // Create a kid with no transactions
    const [kid] = await db.insert(usersTable)
      .values([{ name: 'Kid', role: 'kid', points: 0 }])
      .returning()
      .execute();

    const result = await getPointTransactionsByKidId(kid.id);
    expect(result).toEqual([]);
  });

  it('should return empty array when kid does not exist', async () => {
    const result = await getPointTransactionsByKidId(999);
    expect(result).toEqual([]);
  });

  it('should fetch transactions for specific kid only', async () => {
    // Create test kids
    const [kid1, kid2] = await db.insert(usersTable)
      .values([
        { name: 'Kid 1', role: 'kid', points: 0 },
        { name: 'Kid 2', role: 'kid', points: 0 }
      ])
      .returning()
      .execute();

    // Create transactions for both kids
    await db.insert(pointTransactionsTable)
      .values([
        {
          kid_id: kid1.id,
          transaction_type: 'chore_completion',
          points_change: 10,
          reference_id: 1
        },
        {
          kid_id: kid2.id,
          transaction_type: 'reward_redemption',
          points_change: -5,
          reference_id: 2
        },
        {
          kid_id: kid1.id,
          transaction_type: 'penalty_application',
          points_change: -3,
          reference_id: 3
        }
      ])
      .execute();

    const result = await getPointTransactionsByKidId(kid1.id);

    expect(result).toHaveLength(2);
    
    // Verify all transactions belong to kid1
    result.forEach(transaction => {
      expect(transaction.kid_id).toEqual(kid1.id);
    });

    // Verify we get the correct transactions
    const pointChanges = result.map(t => t.points_change).sort((a, b) => b - a);
    expect(pointChanges).toEqual([10, -3]);
  });

  it('should order transactions by created_at desc for specific kid', async () => {
    // Create test kid
    const [kid] = await db.insert(usersTable)
      .values([{ name: 'Kid', role: 'kid', points: 0 }])
      .returning()
      .execute();

    // Create transactions with different timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(pointTransactionsTable)
      .values([
        {
          kid_id: kid.id,
          transaction_type: 'chore_completion',
          points_change: 10,
          reference_id: 1,
          created_at: yesterday
        },
        {
          kid_id: kid.id,
          transaction_type: 'reward_redemption',
          points_change: -5,
          reference_id: 2,
          created_at: tomorrow
        },
        {
          kid_id: kid.id,
          transaction_type: 'penalty_application',
          points_change: -3,
          reference_id: 3,
          created_at: now
        }
      ])
      .execute();

    const result = await getPointTransactionsByKidId(kid.id);

    expect(result).toHaveLength(3);
    
    // Verify ordering (most recent first)
    expect(result[0].points_change).toEqual(-5);
    expect(result[0].transaction_type).toEqual('reward_redemption');
    
    expect(result[1].points_change).toEqual(-3);
    expect(result[1].transaction_type).toEqual('penalty_application');
    
    expect(result[2].points_change).toEqual(10);
    expect(result[2].transaction_type).toEqual('chore_completion');

    // Verify all required fields are present and correct types
    result.forEach(transaction => {
      expect(transaction.id).toBeDefined();
      expect(transaction.kid_id).toEqual(kid.id);
      expect(transaction.transaction_type).toBeDefined();
      expect(transaction.points_change).toBeDefined();
      expect(transaction.reference_id).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(typeof transaction.points_change).toBe('number');
    });
  });

  it('should handle various transaction types and point values', async () => {
    // Create test kid
    const [kid] = await db.insert(usersTable)
      .values([{ name: 'Kid', role: 'kid', points: 0 }])
      .returning()
      .execute();

    // Create transactions of different types
    await db.insert(pointTransactionsTable)
      .values([
        {
          kid_id: kid.id,
          transaction_type: 'chore_completion',
          points_change: 25,
          reference_id: 1
        },
        {
          kid_id: kid.id,
          transaction_type: 'reward_redemption',
          points_change: -15,
          reference_id: 2
        },
        {
          kid_id: kid.id,
          transaction_type: 'penalty_application',
          points_change: -10,
          reference_id: 3
        }
      ])
      .execute();

    const result = await getPointTransactionsByKidId(kid.id);

    expect(result).toHaveLength(3);
    
    // Verify all transaction types are present
    const transactionTypes = result.map(t => t.transaction_type).sort();
    expect(transactionTypes).toEqual([
      'chore_completion',
      'penalty_application', 
      'reward_redemption'
    ]);

    // Verify point changes
    const pointChanges = result.map(t => t.points_change).sort((a, b) => b - a);
    expect(pointChanges).toEqual([25, -10, -15]);
  });
});
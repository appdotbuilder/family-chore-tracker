import { db } from '../db';
import { pointTransactionsTable } from '../db/schema';
import { type PointTransaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getPointTransactions(): Promise<PointTransaction[]> {
  try {
    const results = await db.select()
      .from(pointTransactionsTable)
      .orderBy(desc(pointTransactionsTable.created_at))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      // All fields are already correct types from the database
      // No numeric conversions needed as points_change is integer
    }));
  } catch (error) {
    console.error('Failed to fetch point transactions:', error);
    throw error;
  }
}

export async function getPointTransactionsByKidId(kidId: number): Promise<PointTransaction[]> {
  try {
    const results = await db.select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.kid_id, kidId))
      .orderBy(desc(pointTransactionsTable.created_at))
      .execute();

    return results.map(transaction => ({
      ...transaction,
      // All fields are already correct types from the database
      // No numeric conversions needed as points_change is integer
    }));
  } catch (error) {
    console.error('Failed to fetch point transactions by kid ID:', error);
    throw error;
  }
}
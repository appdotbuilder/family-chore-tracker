import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        name: input.name,
        role: input.role,
        points: 0 // Always initialize points to 0 for both parents and kids
      })
      .returning()
      .execute();

    // Return the created user
    const user = result[0];
    return {
      ...user,
      created_at: user.created_at // Already a Date object from timestamp column
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
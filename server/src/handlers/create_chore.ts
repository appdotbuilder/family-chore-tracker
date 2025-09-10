import { db } from '../db';
import { choresTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateChoreInput, type Chore } from '../schema';

export const createChore = async (input: CreateChoreInput): Promise<Chore> => {
  try {
    // Validate that the assigned kid exists and has role 'kid'
    const assignedKid = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.assigned_kid_id))
      .execute();

    if (assignedKid.length === 0 || assignedKid[0].role !== 'kid') {
      throw new Error('Assigned kid does not exist or is not a valid kid user');
    }

    // Validate that the parent creating it exists and has role 'parent'
    const creatingParent = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by_parent_id))
      .execute();

    if (creatingParent.length === 0 || creatingParent[0].role !== 'parent') {
      throw new Error('Creating parent does not exist or is not a valid parent user');
    }

    // Create the chore
    const result = await db.insert(choresTable)
      .values({
        name: input.name,
        point_value: input.point_value,
        frequency: input.frequency,
        assigned_kid_id: input.assigned_kid_id,
        status: 'pending',
        created_by_parent_id: input.created_by_parent_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Chore creation failed:', error);
    throw error;
  }
};
import { type CreatePenaltyInput, type Penalty } from '../schema';

export async function createPenalty(input: CreatePenaltyInput): Promise<Penalty> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new penalty template and persisting it in the database.
    // This should validate that the parent creating it exists.
    // Only parents should be able to create penalties.
    return Promise.resolve({
        id: 0, // Placeholder ID
        name: input.name,
        description: input.description,
        point_deduction: input.point_deduction,
        created_by_parent_id: input.created_by_parent_id,
        created_at: new Date()
    } as Penalty);
}
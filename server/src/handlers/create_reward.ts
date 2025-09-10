import { type CreateRewardInput, type Reward } from '../schema';

export async function createReward(input: CreateRewardInput): Promise<Reward> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new reward and persisting it in the database.
    // This should validate that the parent creating it exists.
    // Only parents should be able to create rewards.
    return Promise.resolve({
        id: 0, // Placeholder ID
        name: input.name,
        description: input.description,
        image_url: input.image_url,
        point_cost: input.point_cost,
        created_by_parent_id: input.created_by_parent_id,
        created_at: new Date()
    } as Reward);
}
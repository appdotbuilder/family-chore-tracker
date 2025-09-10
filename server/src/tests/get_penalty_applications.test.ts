import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, penaltiesTable, penaltyApplicationsTable } from '../db/schema';
import { 
  getPenaltyApplications, 
  getPenaltyApplicationsByKidId, 
  getPenaltyApplicationsByParentId 
} from '../handlers/get_penalty_applications';

describe('getPenaltyApplications handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { name: 'Test Parent 1', role: 'parent', points: 0 },
        { name: 'Test Parent 2', role: 'parent', points: 0 },
        { name: 'Test Kid 1', role: 'kid', points: 100 },
        { name: 'Test Kid 2', role: 'kid', points: 150 }
      ])
      .returning()
      .execute();

    const [parent1, parent2, kid1, kid2] = users;

    // Create test penalties
    const penalties = await db.insert(penaltiesTable)
      .values([
        { 
          name: 'Breaking Rules', 
          description: 'General rule breaking', 
          point_deduction: 10, 
          created_by_parent_id: parent1.id 
        },
        { 
          name: 'Not Cleaning Room', 
          description: 'Room was messy', 
          point_deduction: 5, 
          created_by_parent_id: parent2.id 
        }
      ])
      .returning()
      .execute();

    const [penalty1, penalty2] = penalties;

    // Create test penalty applications
    const penaltyApplications = await db.insert(penaltyApplicationsTable)
      .values([
        {
          penalty_id: penalty1.id,
          kid_id: kid1.id,
          applied_by_parent_id: parent1.id,
          points_deducted: 10
        },
        {
          penalty_id: penalty2.id,
          kid_id: kid2.id,
          applied_by_parent_id: parent2.id,
          points_deducted: 5
        },
        {
          penalty_id: penalty1.id,
          kid_id: kid2.id,
          applied_by_parent_id: parent1.id,
          points_deducted: 10
        }
      ])
      .returning()
      .execute();

    return {
      parent1,
      parent2,
      kid1,
      kid2,
      penalty1,
      penalty2,
      penaltyApplications
    };
  };

  describe('getPenaltyApplications', () => {
    it('should return all penalty applications', async () => {
      const { penaltyApplications } = await setupTestData();

      const results = await getPenaltyApplications();

      expect(results).toHaveLength(3);
      expect(results.every(app => app.id && app.penalty_id && app.kid_id && app.applied_by_parent_id)).toBe(true);
      expect(results.every(app => app.applied_at instanceof Date)).toBe(true);
      expect(results.every(app => typeof app.points_deducted === 'number')).toBe(true);
    });

    it('should return penalty applications ordered by applied_at descending', async () => {
      await setupTestData();

      const results = await getPenaltyApplications();

      expect(results).toHaveLength(3);
      // Check that results are ordered by applied_at descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].applied_at >= results[i + 1].applied_at).toBe(true);
      }
    });

    it('should return empty array when no penalty applications exist', async () => {
      const results = await getPenaltyApplications();

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getPenaltyApplicationsByKidId', () => {
    it('should return penalty applications for specific kid', async () => {
      const { kid1, kid2 } = await setupTestData();

      const kid1Results = await getPenaltyApplicationsByKidId(kid1.id);
      const kid2Results = await getPenaltyApplicationsByKidId(kid2.id);

      expect(kid1Results).toHaveLength(1);
      expect(kid2Results).toHaveLength(2);
      
      // Verify all results are for the correct kid
      expect(kid1Results.every(app => app.kid_id === kid1.id)).toBe(true);
      expect(kid2Results.every(app => app.kid_id === kid2.id)).toBe(true);
    });

    it('should return penalty applications ordered by applied_at descending', async () => {
      const { kid2 } = await setupTestData();

      const results = await getPenaltyApplicationsByKidId(kid2.id);

      expect(results).toHaveLength(2);
      // Check that results are ordered by applied_at descending
      expect(results[0].applied_at >= results[1].applied_at).toBe(true);
    });

    it('should return empty array for kid with no penalty applications', async () => {
      const { kid1 } = await setupTestData();

      const results = await getPenaltyApplicationsByKidId(999); // Non-existent kid

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should include all required penalty application fields', async () => {
      const { kid1 } = await setupTestData();

      const results = await getPenaltyApplicationsByKidId(kid1.id);

      expect(results).toHaveLength(1);
      const app = results[0];
      expect(app.id).toBeDefined();
      expect(app.penalty_id).toBeDefined();
      expect(app.kid_id).toBe(kid1.id);
      expect(app.applied_by_parent_id).toBeDefined();
      expect(app.applied_at).toBeInstanceOf(Date);
      expect(typeof app.points_deducted).toBe('number');
    });
  });

  describe('getPenaltyApplicationsByParentId', () => {
    it('should return penalty applications created by specific parent', async () => {
      const { parent1, parent2 } = await setupTestData();

      const parent1Results = await getPenaltyApplicationsByParentId(parent1.id);
      const parent2Results = await getPenaltyApplicationsByParentId(parent2.id);

      expect(parent1Results).toHaveLength(2);
      expect(parent2Results).toHaveLength(1);
      
      // Verify all results are from the correct parent
      expect(parent1Results.every(app => app.applied_by_parent_id === parent1.id)).toBe(true);
      expect(parent2Results.every(app => app.applied_by_parent_id === parent2.id)).toBe(true);
    });

    it('should return penalty applications ordered by applied_at descending', async () => {
      const { parent1 } = await setupTestData();

      const results = await getPenaltyApplicationsByParentId(parent1.id);

      expect(results).toHaveLength(2);
      // Check that results are ordered by applied_at descending
      expect(results[0].applied_at >= results[1].applied_at).toBe(true);
    });

    it('should return empty array for parent with no penalty applications', async () => {
      await setupTestData();

      const results = await getPenaltyApplicationsByParentId(999); // Non-existent parent

      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should include all required penalty application fields', async () => {
      const { parent1 } = await setupTestData();

      const results = await getPenaltyApplicationsByParentId(parent1.id);

      expect(results).toHaveLength(2);
      results.forEach(app => {
        expect(app.id).toBeDefined();
        expect(app.penalty_id).toBeDefined();
        expect(app.kid_id).toBeDefined();
        expect(app.applied_by_parent_id).toBe(parent1.id);
        expect(app.applied_at).toBeInstanceOf(Date);
        expect(typeof app.points_deducted).toBe('number');
      });
    });
  });
});
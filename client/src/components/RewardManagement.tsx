import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Reward, CreateRewardInput } from '../../../server/src/schema';

interface RewardManagementProps {
  currentUser: User;
}

export function RewardManagement({ currentUser }: RewardManagementProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateRewardInput>({
    name: '',
    description: null,
    image_url: null,
    point_cost: 25,
    created_by_parent_id: currentUser.id
  });

  const loadRewards = useCallback(async () => {
    try {
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubRewards: Reward[] = [
        {
          id: 1,
          name: '🍦 Ice Cream Treat',
          description: 'Choose your favorite ice cream flavor!',
          image_url: null,
          point_cost: 25,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 2,
          name: '🎮 Extra Gaming Time',
          description: '1 hour of extra screen time',
          image_url: null,
          point_cost: 50,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 3,
          name: '🎁 Small Toy',
          description: 'Pick a small toy from the store (up to $10)',
          image_url: null,
          point_cost: 100,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 4,
          name: '🎬 Movie Night Choice',
          description: 'You get to pick the family movie for movie night!',
          image_url: null,
          point_cost: 30,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 5,
          name: '🍕 Pizza Day',
          description: 'Request pizza for dinner this week',
          image_url: null,
          point_cost: 75,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        }
      ];
      setRewards(stubRewards);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingReward) {
        await trpc.updateReward.mutate({
          id: editingReward.id,
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url,
          point_cost: formData.point_cost
        });
        // Update local state
        setRewards((prev: Reward[]) =>
          prev.map((reward: Reward) =>
            reward.id === editingReward.id
              ? { ...reward, ...formData }
              : reward
          )
        );
      } else {
        await trpc.createReward.mutate(formData);
        // Add to local state (simulated)
        const newReward: Reward = {
          id: rewards.length + 1,
          ...formData,
          created_at: new Date()
        };
        setRewards((prev: Reward[]) => [...prev, newReward]);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: null,
        image_url: null,
        point_cost: 25,
        created_by_parent_id: currentUser.id
      });
      setIsDialogOpen(false);
      setEditingReward(null);
    } catch (error) {
      console.error('Failed to save reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description,
      image_url: reward.image_url,
      point_cost: reward.point_cost,
      created_by_parent_id: reward.created_by_parent_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (rewardId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteReward.mutate(rewardId);
      setRewards((prev: Reward[]) => prev.filter((reward: Reward) => reward.id !== rewardId));
    } catch (error) {
      console.error('Failed to delete reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setEditingReward(null);
    setFormData({
      name: '',
      description: null,
      image_url: null,
      point_cost: 25,
      created_by_parent_id: currentUser.id
    });
  };

  const getRewardEmoji = (name: string) => {
    if (name.includes('🍦')) return '🍦';
    if (name.includes('🎮')) return '🎮';
    if (name.includes('🎁')) return '🎁';
    if (name.includes('🎬')) return '🎬';
    if (name.includes('🍕')) return '🍕';
    return '🎁';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">🎁 Reward Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetDialog}
              className="bg-pink-600 hover:bg-pink-700"
            >
              ➕ Create Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingReward ? '✏️ Edit Reward' : '➕ Create New Reward'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reward Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRewardInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., 🍦 Ice Cream Treat, 🎮 Extra Gaming Time..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateRewardInput) => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Describe what this reward includes..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (Optional)
                </label>
                <Input
                  value={formData.image_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRewardInput) => ({ ...prev, image_url: e.target.value || null }))
                  }
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Point Cost
                </label>
                <Input
                  type="number"
                  value={formData.point_cost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateRewardInput) => ({ ...prev, point_cost: parseInt(e.target.value) || 0 }))
                  }
                  min="1"
                  max="1000"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingReward ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rewards.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-2">🎁</div>
                <h3 className="text-lg font-semibold text-gray-600 mb-1">No rewards yet</h3>
                <p className="text-gray-500">Create your first reward to motivate the kids!</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          rewards.map((reward: Reward) => (
            <Card key={reward.id} className="border-2 border-pink-200">
              <CardContent className="p-4">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">
                    {getRewardEmoji(reward.name)}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {reward.name.replace(/[\u{1F366}\u{1F3AE}\u{1F381}\u{1F3AC}\u{1F355}]/gu, '').trim()}
                  </h3>
                  {reward.description && (
                    <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                  )}
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    ⭐ {reward.point_cost} points
                  </Badge>
                </div>

                <div className="flex justify-center gap-2">
                  <Button
                    onClick={() => handleEdit(reward)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    ✏️ Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={isLoading}
                      >
                        🗑️ Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reward</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{reward.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(reward.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {rewards.length > 0 && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-800">📊 Reward Statistics</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{rewards.length}</div>
                <div className="text-sm text-gray-600">Total Rewards</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.min(...rewards.map((r: Reward) => r.point_cost))}
                </div>
                <div className="text-sm text-gray-600">Cheapest</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...rewards.map((r: Reward) => r.point_cost))}
                </div>
                <div className="text-sm text-gray-600">Most Expensive</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(rewards.reduce((sum: number, r: Reward) => sum + r.point_cost, 0) / rewards.length)}
                </div>
                <div className="text-sm text-gray-600">Average Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
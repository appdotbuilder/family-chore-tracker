import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Chore, Reward, RewardRequest } from '../../../server/src/schema';

interface KidDashboardProps {
  currentUser: User;
}

export function KidDashboard({ currentUser }: KidDashboardProps) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [myRequests, setMyRequests] = useState<RewardRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadKidData = useCallback(async () => {
    try {
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubChores: Chore[] = [
        {
          id: 1,
          name: 'Make your bed',
          point_value: 5,
          frequency: 'daily',
          assigned_kid_id: currentUser.id,
          status: 'pending',
          created_by_parent_id: 1,
          created_at: new Date(),
          completed_at: null,
          approved_at: null
        },
        {
          id: 2,
          name: 'Feed the pets',
          point_value: 10,
          frequency: 'daily',
          assigned_kid_id: currentUser.id,
          status: 'pending',
          created_by_parent_id: 1,
          created_at: new Date(),
          completed_at: null,
          approved_at: null
        },
        {
          id: 3,
          name: 'Clean bedroom',
          point_value: 15,
          frequency: 'weekly',
          assigned_kid_id: currentUser.id,
          status: 'completed_pending_approval',
          created_by_parent_id: 1,
          created_at: new Date(),
          completed_at: new Date(),
          approved_at: null
        },
        {
          id: 4,
          name: 'Help with dishes',
          point_value: 8,
          frequency: 'daily',
          assigned_kid_id: currentUser.id,
          status: 'approved',
          created_by_parent_id: 1,
          created_at: new Date(),
          completed_at: new Date(Date.now() - 86400000), // Yesterday
          approved_at: new Date()
        }
      ];

      const stubRewards: Reward[] = [
        {
          id: 1,
          name: '🍦 Ice Cream Treat',
          description: 'Choose your favorite ice cream flavor!',
          image_url: null,
          point_cost: 25,
          created_by_parent_id: 1,
          created_at: new Date()
        },
        {
          id: 2,
          name: '🎮 Extra Gaming Time',
          description: '1 hour of extra screen time',
          image_url: null,
          point_cost: 50,
          created_by_parent_id: 1,
          created_at: new Date()
        },
        {
          id: 3,
          name: '🎁 Small Toy',
          description: 'Pick a small toy from the store',
          image_url: null,
          point_cost: 100,
          created_by_parent_id: 1,
          created_at: new Date()
        },
        {
          id: 4,
          name: '🎬 Movie Night Choice',
          description: 'You pick the family movie!',
          image_url: null,
          point_cost: 30,
          created_by_parent_id: 1,
          created_at: new Date()
        },
        {
          id: 5,
          name: '🍕 Pizza Day',
          description: 'Request pizza for dinner',
          image_url: null,
          point_cost: 75,
          created_by_parent_id: 1,
          created_at: new Date()
        }
      ];

      const stubRequests: RewardRequest[] = [
        {
          id: 1,
          reward_id: 1,
          kid_id: currentUser.id,
          status: 'pending',
          requested_at: new Date(),
          processed_at: null,
          processed_by_parent_id: null
        }
      ];

      setChores(stubChores);
      setRewards(stubRewards);
      setMyRequests(stubRequests);
    } catch (error) {
      console.error('Failed to load kid data:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadKidData();
  }, [loadKidData]);

  const handleMarkCompleted = async (choreId: number) => {
    setIsLoading(true);
    try {
      await trpc.markChoreCompleted.mutate({
        chore_id: choreId,
        kid_id: currentUser.id
      });
      // Update local state
      setChores((prev: Chore[]) =>
        prev.map((chore: Chore) =>
          chore.id === choreId
            ? { ...chore, status: 'completed_pending_approval' as const, completed_at: new Date() }
            : chore
        )
      );
    } catch (error) {
      console.error('Failed to mark chore as completed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReward = async (rewardId: number) => {
    setIsLoading(true);
    try {
      await trpc.createRewardRequest.mutate({
        reward_id: rewardId,
        kid_id: currentUser.id
      });
      // Update local state
      const newRequest: RewardRequest = {
        id: myRequests.length + 1,
        reward_id: rewardId,
        kid_id: currentUser.id,
        status: 'pending',
        requested_at: new Date(),
        processed_at: null,
        processed_by_parent_id: null
      };
      setMyRequests((prev: RewardRequest[]) => [...prev, newRequest]);
    } catch (error) {
      console.error('Failed to request reward:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingChores = chores.filter((chore: Chore) => chore.status === 'pending');
  const waitingApproval = chores.filter((chore: Chore) => chore.status === 'completed_pending_approval');
  const completedChores = chores.filter((chore: Chore) => chore.status === 'approved');

  const getRewardName = (rewardId: number) => {
    const reward = rewards.find((r: Reward) => r.id === rewardId);
    return reward ? reward.name : 'Unknown Reward';
  };

  const canAffordReward = (cost: number) => currentUser.points >= cost;

  const hasRequestedReward = (rewardId: number) => 
    myRequests.some((req: RewardRequest) => req.reward_id === rewardId && req.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-yellow-800">
            ⭐ Your Points: {currentUser.points}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            Keep completing chores to earn more points! 🚀
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-700">📋 To Do</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{pendingChores.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-700">⏳ Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{waitingApproval.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-700">✅ Done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{completedChores.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-700">🎁 Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">{myRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chores" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chores">🧹 My Chores</TabsTrigger>
          <TabsTrigger value="rewards">🎁 Rewards Store</TabsTrigger>
        </TabsList>

        <TabsContent value="chores" className="mt-6">
          <div className="space-y-6">
            {/* Pending Chores */}
            {pendingChores.length > 0 && (
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50">
                  <CardTitle className="text-blue-800">📋 Chores To Do</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {pendingChores.map((chore: Chore) => (
                      <div key={chore.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">!</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">{chore.name}</h4>
                            <p className="text-sm text-gray-600">
                              Worth {chore.point_value} points • {chore.frequency}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleMarkCompleted(chore.id)}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✅ Done!
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Waiting for Approval */}
            {waitingApproval.length > 0 && (
              <Card className="border-2 border-yellow-200">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="text-yellow-800">⏳ Waiting for Mom/Dad</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {waitingApproval.map((chore: Chore) => (
                      <div key={chore.id} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-yellow-100">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-yellow-600">⏰</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{chore.name}</h4>
                          <p className="text-sm text-gray-600">
                            Will earn {chore.point_value} points when approved
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Chores */}
            {completedChores.length > 0 && (
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-green-800">✅ Recently Completed</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {completedChores.slice(0, 3).map((chore: Chore) => (
                      <div key={chore.id} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-green-100">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600">✅</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{chore.name}</h4>
                          <p className="text-sm text-gray-600">
                            Earned {chore.point_value} points
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          +{chore.point_value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="mt-6">
          <div className="space-y-6">
            {/* My Requests */}
            {myRequests.length > 0 && (
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50">
                  <CardTitle className="text-purple-800">🎁 My Reward Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {myRequests.map((request: RewardRequest) => (
                      <div key={request.id} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-purple-100">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600">🎁</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{getRewardName(request.reward_id)}</h4>
                          <p className="text-sm text-gray-600">
                            Requested on {request.requested_at.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Rewards */}
            <Card className="border-2 border-pink-200">
              <CardHeader className="bg-pink-50">
                <CardTitle className="text-pink-800">🏪 Rewards Store</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rewards.map((reward: Reward) => (
                    <div key={reward.id} className="p-4 bg-white rounded-lg border border-pink-100">
                      <div className="text-center mb-3">
                        <div className="text-3xl mb-2">
                          {reward.name.includes('🍦') ? '🍦' : 
                           reward.name.includes('🎮') ? '🎮' :
                           reward.name.includes('🎁') ? '🎁' :
                           reward.name.includes('🎬') ? '🎬' :
                           reward.name.includes('🍕') ? '🍕' : '🎈'}
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {reward.name.replace(/[\u{1F366}\u{1F3AE}\u{1F381}\u{1F3AC}\u{1F355}\u{1F388}]/gu, '').trim()}
                        </h4>
                        {reward.description && (
                          <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                        )}
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Badge 
                            variant="secondary" 
                            className={canAffordReward(reward.point_cost) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            ⭐ {reward.point_cost} points
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRequestReward(reward.id)}
                        disabled={!canAffordReward(reward.point_cost) || hasRequestedReward(reward.id) || isLoading}
                        className="w-full"
                        variant={canAffordReward(reward.point_cost) ? 'default' : 'secondary'}
                      >
                        {hasRequestedReward(reward.id) ? 'Already Requested' :
                         !canAffordReward(reward.point_cost) ? 'Need More Points' :
                         '🛒 Request This!'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Chore, RewardRequest } from '../../../server/src/schema';

// Import management components
import { ChoreManagement } from './ChoreManagement';
import { RewardManagement } from './RewardManagement';
import { PenaltyManagement } from './PenaltyManagement';

interface ParentDashboardProps {
  currentUser: User;
}

export function ParentDashboard({ currentUser }: ParentDashboardProps) {
  const [kids, setKids] = useState<User[]>([]);
  const [pendingChores, setPendingChores] = useState<Chore[]>([]);
  const [pendingRewards, setPendingRewards] = useState<RewardRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubKids: User[] = [
        {
          id: 3,
          name: 'Emma 👧',
          role: 'kid',
          points: 125,
          created_at: new Date()
        },
        {
          id: 4,
          name: 'Alex 👦',
          role: 'kid',
          points: 87,
          created_at: new Date()
        }
      ];

      const stubPendingChores: Chore[] = [
        {
          id: 1,
          name: 'Clean bedroom',
          point_value: 15,
          frequency: 'daily',
          assigned_kid_id: 3,
          status: 'completed_pending_approval',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: new Date(),
          approved_at: null
        },
        {
          id: 2,
          name: 'Take out trash',
          point_value: 10,
          frequency: 'weekly',
          assigned_kid_id: 4,
          status: 'completed_pending_approval',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: new Date(),
          approved_at: null
        }
      ];

      const stubPendingRewards: RewardRequest[] = [
        {
          id: 1,
          reward_id: 1,
          kid_id: 3,
          status: 'pending',
          requested_at: new Date(),
          processed_at: null,
          processed_by_parent_id: null
        }
      ];

      setKids(stubKids);
      setPendingChores(stubPendingChores);
      setPendingRewards(stubPendingRewards);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApproveChore = async (choreId: number, approved: boolean) => {
    setIsLoading(true);
    try {
      await trpc.approveChore.mutate({
        chore_id: choreId,
        parent_id: currentUser.id,
        approved
      });
      // Update local state (in real app, this would refetch data)
      setPendingChores((prev: Chore[]) => 
        prev.filter((chore: Chore) => chore.id !== choreId)
      );
      
      if (approved) {
        // Update kid's points (simulated)
        const chore = pendingChores.find((c: Chore) => c.id === choreId);
        if (chore) {
          setKids((prev: User[]) => 
            prev.map((kid: User) => 
              kid.id === chore.assigned_kid_id 
                ? { ...kid, points: kid.points + chore.point_value }
                : kid
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to approve chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRewardRequest = async (requestId: number, approved: boolean) => {
    setIsLoading(true);
    try {
      await trpc.processRewardRequest.mutate({
        request_id: requestId,
        parent_id: currentUser.id,
        approved
      });
      // Update local state
      setPendingRewards((prev: RewardRequest[]) => 
        prev.filter((req: RewardRequest) => req.id !== requestId)
      );
      
      if (approved) {
        // Deduct points from kid (simulated)
        const request = pendingRewards.find((r: RewardRequest) => r.id === requestId);
        if (request) {
          setKids((prev: User[]) => 
            prev.map((kid: User) => 
              kid.id === request.kid_id 
                ? { ...kid, points: Math.max(0, kid.points - 50) } // Assuming 50 point cost
                : kid
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to process reward request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getKidName = (kidId: number) => {
    const kid = kids.find((k: User) => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  return (
    <div className="space-y-6">
      {/* Family Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-700">👶 Kids</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{kids.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-yellow-700">⏳ Pending Chores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{pendingChores.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-700">🎁 Reward Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{pendingRewards.length}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-purple-700">⭐ Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              {kids.reduce((sum: number, kid: User) => sum + kid.points, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kids Overview */}
      <Card className="border-2 border-pink-200">
        <CardHeader className="bg-pink-50">
          <CardTitle className="text-pink-800">👨‍👩‍👧‍👦 Family Members</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-4">
            {kids.map((kid: User) => (
              <div key={kid.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-pink-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {kid.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{kid.name}</h3>
                    <p className="text-sm text-gray-500">Kid Account</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  ⭐ {kid.points} points
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {(pendingChores.length > 0 || pendingRewards.length > 0) && (
        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-orange-800">⏰ Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {pendingChores.map((chore: Chore) => (
                <div key={chore.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-100">
                  <div>
                    <h4 className="font-semibold text-gray-800">✅ {chore.name}</h4>
                    <p className="text-sm text-gray-600">
                      Completed by {getKidName(chore.assigned_kid_id)} • Worth {chore.point_value} points
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproveChore(chore.id, false)}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      ❌ Reject
                    </Button>
                    <Button
                      onClick={() => handleApproveChore(chore.id, true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      ✅ Approve
                    </Button>
                  </div>
                </div>
              ))}

              {pendingRewards.map((request: RewardRequest) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-100">
                  <div>
                    <h4 className="font-semibold text-gray-800">🎁 Reward Request</h4>
                    <p className="text-sm text-gray-600">
                      Requested by {getKidName(request.kid_id)} • Costs 50 points
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleProcessRewardRequest(request.id, false)}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                    >
                      ❌ Reject
                    </Button>
                    <Button
                      onClick={() => handleProcessRewardRequest(request.id, true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      ✅ Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Management Tabs */}
      <Tabs defaultValue="chores" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chores">🧹 Chores</TabsTrigger>
          <TabsTrigger value="rewards">🎁 Rewards</TabsTrigger>
          <TabsTrigger value="penalties">⚠️ Penalties</TabsTrigger>
        </TabsList>

        <TabsContent value="chores" className="mt-6">
          <ChoreManagement currentUser={currentUser} kids={kids} />
        </TabsContent>

        <TabsContent value="rewards" className="mt-6">
          <RewardManagement currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="penalties" className="mt-6">
          <PenaltyManagement currentUser={currentUser} kids={kids} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
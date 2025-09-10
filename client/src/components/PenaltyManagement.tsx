import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Penalty, CreatePenaltyInput, PenaltyApplication } from '../../../server/src/schema';

interface PenaltyManagementProps {
  currentUser: User;
  kids: User[];
}

export function PenaltyManagement({ currentUser, kids }: PenaltyManagementProps) {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [applications, setApplications] = useState<PenaltyApplication[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
  const [selectedKid, setSelectedKid] = useState<number>(kids[0]?.id || 0);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreatePenaltyInput>({
    name: '',
    description: null,
    point_deduction: 10,
    created_by_parent_id: currentUser.id
  });

  const loadPenaltyData = useCallback(async () => {
    try {
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubPenalties: Penalty[] = [
        {
          id: 1,
          name: '⏰ Timeout',
          description: '10 minutes of quiet time',
          point_deduction: 5,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 2,
          name: '📺 No Screen Time',
          description: 'Loss of TV/tablet privileges for the evening',
          point_deduction: 15,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 3,
          name: '🛏️ Early Bedtime',
          description: 'Bedtime 30 minutes earlier',
          point_deduction: 10,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        },
        {
          id: 4,
          name: '🧹 Extra Chores',
          description: 'Additional cleaning tasks',
          point_deduction: 20,
          created_by_parent_id: currentUser.id,
          created_at: new Date()
        }
      ];

      const stubApplications: PenaltyApplication[] = [
        {
          id: 1,
          penalty_id: 1,
          kid_id: 3,
          applied_by_parent_id: currentUser.id,
          applied_at: new Date(),
          points_deducted: 5
        },
        {
          id: 2,
          penalty_id: 2,
          kid_id: 4,
          applied_by_parent_id: currentUser.id,
          applied_at: new Date(Date.now() - 86400000), // Yesterday
          points_deducted: 15
        }
      ];

      setPenalties(stubPenalties);
      setApplications(stubApplications);
    } catch (error) {
      console.error('Failed to load penalty data:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadPenaltyData();
  }, [loadPenaltyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingPenalty) {
        await trpc.updatePenalty.mutate({
          id: editingPenalty.id,
          name: formData.name,
          description: formData.description,
          point_deduction: formData.point_deduction
        });
        // Update local state
        setPenalties((prev: Penalty[]) =>
          prev.map((penalty: Penalty) =>
            penalty.id === editingPenalty.id
              ? { ...penalty, ...formData }
              : penalty
          )
        );
      } else {
        await trpc.createPenalty.mutate(formData);
        // Add to local state (simulated)
        const newPenalty: Penalty = {
          id: penalties.length + 1,
          ...formData,
          created_at: new Date()
        };
        setPenalties((prev: Penalty[]) => [...prev, newPenalty]);
      }
      
      // Reset form
      setFormData({
        name: '',
        description: null,
        point_deduction: 10,
        created_by_parent_id: currentUser.id
      });
      setIsDialogOpen(false);
      setEditingPenalty(null);
    } catch (error) {
      console.error('Failed to save penalty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPenalty = async () => {
    if (!selectedPenalty) return;
    
    setIsLoading(true);
    try {
      await trpc.applyPenalty.mutate({
        penalty_id: selectedPenalty.id,
        kid_id: selectedKid,
        applied_by_parent_id: currentUser.id
      });
      
      // Add to applications (simulated)
      const newApplication: PenaltyApplication = {
        id: applications.length + 1,
        penalty_id: selectedPenalty.id,
        kid_id: selectedKid,
        applied_by_parent_id: currentUser.id,
        applied_at: new Date(),
        points_deducted: selectedPenalty.point_deduction
      };
      setApplications((prev: PenaltyApplication[]) => [...prev, newApplication]);
      
      setIsApplyDialogOpen(false);
      setSelectedPenalty(null);
    } catch (error) {
      console.error('Failed to apply penalty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (penalty: Penalty) => {
    setEditingPenalty(penalty);
    setFormData({
      name: penalty.name,
      description: penalty.description,
      point_deduction: penalty.point_deduction,
      created_by_parent_id: penalty.created_by_parent_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (penaltyId: number) => {
    setIsLoading(true);
    try {
      await trpc.deletePenalty.mutate(penaltyId);
      setPenalties((prev: Penalty[]) => prev.filter((penalty: Penalty) => penalty.id !== penaltyId));
    } catch (error) {
      console.error('Failed to delete penalty:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setEditingPenalty(null);
    setFormData({
      name: '',
      description: null,
      point_deduction: 10,
      created_by_parent_id: currentUser.id
    });
  };

  const getKidName = (kidId: number) => {
    const kid = kids.find((k: User) => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  const getPenaltyName = (penaltyId: number) => {
    const penalty = penalties.find((p: Penalty) => p.id === penaltyId);
    return penalty ? penalty.name : 'Unknown Penalty';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">⚠️ Penalty Management</h2>
        <div className="flex gap-2">
          <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setSelectedKid(kids[0]?.id || 0)}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                disabled={penalties.length === 0}
              >
                ⚡ Apply Penalty
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>⚡ Apply Penalty</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Penalty
                  </label>
                  <Select 
                    value={selectedPenalty?.id.toString() || ''} 
                    onValueChange={(value: string) => {
                      const penalty = penalties.find((p: Penalty) => p.id === parseInt(value));
                      setSelectedPenalty(penalty || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a penalty..." />
                    </SelectTrigger>
                    <SelectContent>
                      {penalties.map((penalty: Penalty) => (
                        <SelectItem key={penalty.id} value={penalty.id.toString()}>
                          {penalty.name} (-{penalty.point_deduction} points)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apply to
                  </label>
                  <Select 
                    value={selectedKid.toString()} 
                    onValueChange={(value: string) => setSelectedKid(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kids.map((kid: User) => (
                        <SelectItem key={kid.id} value={kid.id.toString()}>
                          {kid.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPenalty && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-semibold text-gray-800">{selectedPenalty.name}</h4>
                    {selectedPenalty.description && (
                      <p className="text-sm text-gray-600 mt-1">{selectedPenalty.description}</p>
                    )}
                    <p className="text-sm font-medium text-red-600 mt-2">
                      Will deduct {selectedPenalty.point_deduction} points
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsApplyDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleApplyPenalty}
                    disabled={!selectedPenalty || isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? 'Applying...' : 'Apply Penalty'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetDialog}
                className="bg-red-600 hover:bg-red-700"
              >
                ➕ Create Penalty
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPenalty ? '✏️ Edit Penalty' : '➕ Create New Penalty'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Penalty Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePenaltyInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., ⏰ Timeout, 📺 No Screen Time..."
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
                      setFormData((prev: CreatePenaltyInput) => ({ ...prev, description: e.target.value || null }))
                    }
                    placeholder="Describe what this penalty involves..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Point Deduction
                  </label>
                  <Input
                    type="number"
                    value={formData.point_deduction}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreatePenaltyInput) => ({ ...prev, point_deduction: parseInt(e.target.value) || 0 }))
                    }
                    min="1"
                    max="100"
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
                    {isLoading ? 'Saving...' : editingPenalty ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="penalties" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="penalties">⚠️ Available Penalties</TabsTrigger>
          <TabsTrigger value="history">📋 Recent Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="penalties" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {penalties.length === 0 ? (
              <div className="col-span-full">
                <Card className="border-2 border-dashed border-gray-300">
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-1">No penalties yet</h3>
                    <p className="text-gray-500">Create penalties to help manage behavior.</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              penalties.map((penalty: Penalty) => (
                <Card key={penalty.id} className="border-2 border-red-200">
                  <CardContent className="p-4">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-800 mb-2">{penalty.name}</h3>
                      {penalty.description && (
                        <p className="text-sm text-gray-600 mb-3">{penalty.description}</p>
                      )}
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        -{penalty.point_deduction} points
                      </Badge>
                    </div>

                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={() => handleEdit(penalty)}
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
                            <AlertDialogTitle>Delete Penalty</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{penalty.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(penalty.id)}
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
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-800">📋 Penalty Applications</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-1">No penalties applied yet</h3>
                  <p className="text-gray-500">Applied penalties will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.slice().reverse().map((application: PenaltyApplication) => (
                    <div key={application.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600">⚠️</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {getPenaltyName(application.penalty_id)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Applied to {getKidName(application.kid_id)} on{' '}
                            {application.applied_at.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        -{application.points_deducted} points
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
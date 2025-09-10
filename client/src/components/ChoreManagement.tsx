import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { User, Chore, CreateChoreInput, ChoreFrequency } from '../../../server/src/schema';

interface ChoreManagementProps {
  currentUser: User;
  kids: User[];
}

export function ChoreManagement({ currentUser, kids }: ChoreManagementProps) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateChoreInput>({
    name: '',
    point_value: 5,
    frequency: 'daily',
    assigned_kid_id: kids[0]?.id || 0,
    created_by_parent_id: currentUser.id
  });

  const loadChores = useCallback(async () => {
    try {
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubChores: Chore[] = [
        {
          id: 1,
          name: 'Make bed',
          point_value: 5,
          frequency: 'daily',
          assigned_kid_id: 3,
          status: 'pending',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: null,
          approved_at: null
        },
        {
          id: 2,
          name: 'Feed pets',
          point_value: 10,
          frequency: 'daily',
          assigned_kid_id: 4,
          status: 'completed_pending_approval',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: new Date(),
          approved_at: null
        },
        {
          id: 3,
          name: 'Clean bedroom',
          point_value: 15,
          frequency: 'weekly',
          assigned_kid_id: 3,
          status: 'approved',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: new Date(Date.now() - 86400000),
          approved_at: new Date()
        },
        {
          id: 4,
          name: 'Take out trash',
          point_value: 12,
          frequency: 'weekly',
          assigned_kid_id: 4,
          status: 'pending',
          created_by_parent_id: currentUser.id,
          created_at: new Date(),
          completed_at: null,
          approved_at: null
        }
      ];
      setChores(stubChores);
    } catch (error) {
      console.error('Failed to load chores:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadChores();
  }, [loadChores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingChore) {
        await trpc.updateChore.mutate({
          id: editingChore.id,
          name: formData.name,
          point_value: formData.point_value,
          frequency: formData.frequency,
          assigned_kid_id: formData.assigned_kid_id
        });
        // Update local state
        setChores((prev: Chore[]) =>
          prev.map((chore: Chore) =>
            chore.id === editingChore.id
              ? { ...chore, ...formData }
              : chore
          )
        );
      } else {
        await trpc.createChore.mutate(formData);
        // Add to local state (simulated)
        const newChore: Chore = {
          id: chores.length + 1,
          ...formData,
          status: 'pending',
          created_at: new Date(),
          completed_at: null,
          approved_at: null
        };
        setChores((prev: Chore[]) => [...prev, newChore]);
      }
      
      // Reset form
      setFormData({
        name: '',
        point_value: 5,
        frequency: 'daily',
        assigned_kid_id: kids[0]?.id || 0,
        created_by_parent_id: currentUser.id
      });
      setIsDialogOpen(false);
      setEditingChore(null);
    } catch (error) {
      console.error('Failed to save chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore);
    setFormData({
      name: chore.name,
      point_value: chore.point_value,
      frequency: chore.frequency,
      assigned_kid_id: chore.assigned_kid_id,
      created_by_parent_id: chore.created_by_parent_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (choreId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteChore.mutate(choreId);
      setChores((prev: Chore[]) => prev.filter((chore: Chore) => chore.id !== choreId));
    } catch (error) {
      console.error('Failed to delete chore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getKidName = (kidId: number) => {
    const kid = kids.find((k: User) => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  const getStatusBadge = (status: Chore['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">📋 Pending</Badge>;
      case 'completed_pending_approval':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">⏳ Needs Approval</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">✅ Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">❌ Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFrequencyEmoji = (frequency: ChoreFrequency) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '🗓️';
      case 'one_time': return '⭐';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">🧹 Chore Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingChore(null);
                setFormData({
                  name: '',
                  point_value: 5,
                  frequency: 'daily',
                  assigned_kid_id: kids[0]?.id || 0,
                  created_by_parent_id: currentUser.id
                });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ➕ Create Chore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChore ? '✏️ Edit Chore' : '➕ Create New Chore'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chore Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateChoreInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Make bed, Clean room..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Point Value
                </label>
                <Input
                  type="number"
                  value={formData.point_value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateChoreInput) => ({ ...prev, point_value: parseInt(e.target.value) || 0 }))
                  }
                  min="1"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value: ChoreFrequency) =>
                    setFormData((prev: CreateChoreInput) => ({ ...prev, frequency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">📅 Daily</SelectItem>
                    <SelectItem value="weekly">🗓️ Weekly</SelectItem>
                    <SelectItem value="one_time">⭐ One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to
                </label>
                <Select 
                  value={formData.assigned_kid_id ? formData.assigned_kid_id.toString() : (kids[0]?.id.toString() || '')} 
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateChoreInput) => ({ ...prev, assigned_kid_id: parseInt(value) }))
                  }
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingChore ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {chores.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-2">🧹</div>
              <h3 className="text-lg font-semibold text-gray-600 mb-1">No chores yet</h3>
              <p className="text-gray-500">Create your first chore to get started!</p>
            </CardContent>
          </Card>
        ) : (
          chores.map((chore: Chore) => (
            <Card key={chore.id} className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {getFrequencyEmoji(chore.frequency)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{chore.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>👤 {getKidName(chore.assigned_kid_id)}</span>
                        <span>•</span>
                        <span>⭐ {chore.point_value} points</span>
                        <span>•</span>
                        <span>{chore.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(chore.status)}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(chore)}
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
                            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{chore.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(chore.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../../server/src/schema';

// Components
import { KidDashboard } from '@/components/KidDashboard';
import { ParentDashboard } from '@/components/ParentDashboard';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load users on component mount
  const loadUsers = useCallback(async () => {
    try {
      await trpc.getUsers.query();
      // NOTE: Using stub data since backend handlers return empty arrays
      const stubUsers: User[] = [
        {
          id: 1,
          name: 'Mom Sarah',
          role: 'parent' as UserRole,
          points: 0,
          created_at: new Date()
        },
        {
          id: 2,
          name: 'Dad Mike',
          role: 'parent' as UserRole,
          points: 0,
          created_at: new Date()
        },
        {
          id: 3,
          name: 'Emma 👧',
          role: 'kid' as UserRole,
          points: 125,
          created_at: new Date()
        },
        {
          id: 4,
          name: 'Alex 👦',
          role: 'kid' as UserRole,
          points: 87,
          created_at: new Date()
        }
      ];
      setUsers(stubUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      await trpc.createUser.mutate({ name, role });
      // Since backend is stub, simulate the creation
      const simulatedUser: User = {
        id: users.length + 1,
        name,
        role,
        points: role === 'kid' ? 0 : 0,
        created_at: new Date()
      };
      setUsers((prev: User[]) => [...prev, simulatedUser]);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const parents = users.filter((user: User) => user.role === 'parent');
  const kids = users.filter((user: User) => user.role === 'kid');

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="container mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-2">
              🏠 Family Chore Tracker 🏠
            </h1>
            <p className="text-gray-600">Choose your profile to get started!</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-purple-100">
                <CardTitle className="text-center text-purple-800">
                  👥 Who are you?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {parents.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-purple-700">👨‍👩‍👧‍👦 Parents</h3>
                      <div className="grid gap-3">
                        {parents.map((parent: User) => (
                          <Button
                            key={parent.id}
                            onClick={() => setCurrentUser(parent)}
                            className="h-12 text-left justify-start bg-purple-600 hover:bg-purple-700"
                          >
                            {parent.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {kids.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-blue-700">👶 Kids</h3>
                      <div className="grid gap-3">
                        {kids.map((kid: User) => (
                          <Button
                            key={kid.id}
                            onClick={() => setCurrentUser(kid)}
                            className="h-12 text-left justify-between bg-blue-600 hover:bg-blue-700"
                          >
                            <span>{kid.name}</span>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              ⭐ {kid.points} points
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-6">
                    <h3 className="text-lg font-semibold mb-3 text-green-700">➕ Add New Family Member</h3>
                    <CreateUserForm onSubmit={handleCreateUser} isLoading={isLoading} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-800">
              🏠 Family Chore Tracker
            </h1>
            <p className="text-gray-600">
              Welcome back, <span className="font-semibold text-purple-700">{currentUser.name}</span>!
              {currentUser.role === 'kid' && (
                <span className="ml-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    ⭐ {currentUser.points} points
                  </Badge>
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => setCurrentUser(null)}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            Switch User
          </Button>
        </div>

        {/* Content based on user role */}
        {currentUser.role === 'parent' ? (
          <ParentDashboard currentUser={currentUser} />
        ) : (
          <KidDashboard currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

interface CreateUserFormProps {
  onSubmit: (name: string, role: UserRole) => Promise<void>;
  isLoading: boolean;
}

function CreateUserForm({ onSubmit, isLoading }: CreateUserFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('kid');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onSubmit(name.trim(), role);
      setName('');
      setRole('kid');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Enter name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />
        <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kid">👶 Kid</SelectItem>
            <SelectItem value="parent">👨‍👩‍👧‍👦 Parent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !name.trim()}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isLoading ? 'Adding...' : '➕ Add Family Member'}
      </Button>
    </form>
  );
}

export default App;
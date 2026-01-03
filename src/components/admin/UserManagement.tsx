import { useState, useEffect } from 'react';
import { supabase, type Profile, type UserRole } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  Store,
  User,
  ChevronDown,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';

interface ProfileWithDetails extends Profile {
  stores_count?: number;
}

export function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError('Failed to load users');
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const updateUserRole = async (profileId: string, newRole: UserRole) => {
    if (profileId === user?.id) {
      setError('You cannot change your own role');
      return;
    }

    setUpdating(profileId);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);

    if (updateError) {
      setError('Failed to update role');
    } else {
      setSuccess('Role updated successfully');
      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, role: newRole } : p
      ));
      setTimeout(() => setSuccess(null), 3000);
    }
    setUpdating(null);
  };

  const toggleUserAccess = async (profileId: string, isActive: boolean) => {
    if (profileId === user?.id) {
      setError('You cannot deactivate your own account');
      return;
    }

    setUpdating(profileId);
    setError(null);

    const updateData: Partial<Profile> = {
      is_active: !isActive,
      deactivated_at: !isActive ? null : new Date().toISOString(),
      deactivated_by: !isActive ? null : user?.id || null
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId);

    if (updateError) {
      setError('Failed to update access');
    } else {
      setSuccess(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, ...updateData } : p
      ));
      setTimeout(() => setSuccess(null), 3000);
    }
    setUpdating(null);
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch =
      profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && profile.is_active) ||
      (statusFilter === 'inactive' && !profile.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="badge-brutal bg-red-100 text-red-800 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'rsm':
        return (
          <span className="badge-brutal bg-blue-100 text-blue-800 flex items-center gap-1">
            <Store className="w-3 h-3" />
            Store Manager
          </span>
        );
      case 'employee':
        return (
          <span className="badge-brutal bg-gray-100 text-gray-800 flex items-center gap-1">
            <User className="w-3 h-3" />
            Employee
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border-3 border-red-500 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-700 hover:text-red-900"
          >
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border-3 border-green-500 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">{success}</p>
        </div>
      )}

      <div className="card-brutal">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-brutal pl-10"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="select-brutal pr-10"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="rsm">Store Manager</option>
                <option value="employee">Employee</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="select-brutal pr-10"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="text-sm font-medium text-gray-600 mb-4">
          Showing {filteredProfiles.length} of {profiles.length} users
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-3 border-brutal-black">
                <th className="text-left py-3 px-4 font-bold">User</th>
                <th className="text-left py-3 px-4 font-bold">Role</th>
                <th className="text-left py-3 px-4 font-bold">Region</th>
                <th className="text-left py-3 px-4 font-bold">Status</th>
                <th className="text-left py-3 px-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr
                  key={profile.id}
                  className={`border-b border-gray-200 ${
                    !profile.is_active ? 'bg-gray-50 opacity-75' : ''
                  } ${profile.id === user?.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-bold">
                        {profile.full_name || 'No name'}
                        {profile.id === user?.id && (
                          <span className="ml-2 text-xs text-blue-600">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{profile.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getRoleBadge(profile.role)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">
                      {profile.assigned_region || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {profile.is_active ? (
                      <span className="badge-brutal bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                        <UserCheck className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="badge-brutal bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                        <UserX className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={profile.role}
                          onChange={(e) => updateUserRole(profile.id, e.target.value as UserRole)}
                          disabled={updating === profile.id || profile.id === user?.id}
                          className="text-sm border-2 border-brutal-black px-2 py-1 bg-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="employee">Employee</option>
                          <option value="rsm">Store Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button
                        onClick={() => toggleUserAccess(profile.id, profile.is_active)}
                        disabled={updating === profile.id || profile.id === user?.id}
                        className={`px-3 py-1 text-sm font-bold border-2 border-brutal-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          profile.is_active
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {updating === profile.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : profile.is_active ? (
                          'Deactivate'
                        ) : (
                          'Activate'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No users found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

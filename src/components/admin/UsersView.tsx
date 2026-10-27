import React, { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Search, Power, RefreshCw } from 'lucide-react';
import { User, Pagination } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { EmptyState } from '../common/EmptyState';
import { PaginationControls } from '../common/PaginationControls';
import { TableSkeleton } from '../common/LoadingSkeleton';

export const UsersView: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  const fetchUsers = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        const res = await api.getUsers({
          search,
          role: roleFilter,
          page: pageToLoad,
          limit: 15,
        });

        if (res.success) {
          setUsers(res.users);
          setPagination(res.pagination);
        }
      } catch {
        showToast('error', 'Error', 'Failed to retrieve user accounts.');
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, showToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.is_active === 1 ? false : true;
    try {
      await api.toggleUserStatus(user.id, nextStatus);
      showToast(
        'success',
        'Updated',
        `${user.full_name} is now ${nextStatus ? 'active' : 'deactivated'}.`
      );
      fetchUsers(pagination.page);
    } catch (err: any) {
      showToast('error', 'Failed', err.message || 'Could not update user state.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">User Accounts</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor registered student profiles, role authorizations, and account status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchUsers(pagination.page)}
          className="self-start sm:self-auto p-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md text-neutral-600 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student ID, name, or email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white text-neutral-700"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Administrators</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No users found"
          description={
            search || roleFilter !== 'ALL'
              ? 'No registered users match your search query.'
              : 'No students have registered accounts yet. They can register using the Student Portal.'
          }
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 font-tabular">Student ID / Roll</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 font-tabular">Complaints</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 font-tabular">Last Sign In</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{u.full_name}</div>
                      <div className="text-[11px] text-neutral-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-tabular font-medium text-neutral-800">
                      {u.student_id || <span className="text-neutral-400 font-normal">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {u.department_name || <span className="text-neutral-400">—</span>}
                    </td>
                    <td className="py-3 px-4 font-tabular text-neutral-700 font-medium">
                      {u.complaint_count || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                          u.is_active === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {u.is_active === 1 ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-tabular text-neutral-500 text-[11px]">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {u.role !== 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                            u.is_active === 1
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{u.is_active === 1 ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls pagination={pagination} onPageChange={(p) => fetchUsers(p)} />
        </div>
      )}
    </div>
  );
};

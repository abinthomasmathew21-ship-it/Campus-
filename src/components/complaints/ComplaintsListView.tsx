import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ListOrdered,
  Eye,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { Complaint, Department, Pagination } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { EmptyState } from '../common/EmptyState';
import { TableSkeleton } from '../common/LoadingSkeleton';
import { PaginationControls } from '../common/PaginationControls';

interface ComplaintsListViewProps {
  onSelectComplaint: (id: number) => void;
  onNavigateSubmit?: () => void;
  mode?: 'student' | 'staff' | 'admin';
}

const CATEGORIES = [
  'ALL',
  'Electrical Issues',
  'Classroom Maintenance',
  'Laboratory Issues',
  'Hostel Issues',
  'Water Supply',
  'Cleanliness',
  'Internet & Wi-Fi',
  'Library Issues',
  'Other',
];

export const ComplaintsListView: React.FC<ComplaintsListViewProps> = ({
  onSelectComplaint,
  onNavigateSubmit,
  mode = 'student',
}) => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.getDepartments();
      if (res.success) {
        setDepartments(res.departments);
      }
    } catch {
      // Ignore
    }
  }, []);

  const loadComplaints = useCallback(
    async (pageToLoad = 1) => {
      try {
        setLoading(true);
        const res = await api.getComplaints({
          search,
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          department_id: deptFilter,
          page: pageToLoad,
          limit: 10,
        });

        if (res.success) {
          setComplaints(res.complaints);
          setPagination(res.pagination);
        }
      } catch (error) {
        console.error('Failed to load complaints:', error);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, priorityFilter, categoryFilter, deptFilter]
  );

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadComplaints(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [loadComplaints]);

  const handlePageChange = (newPage: number) => {
    loadComplaints(newPage);
  };

  const hasActiveFilters =
    Boolean(search) ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    deptFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setDeptFilter('ALL');
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {mode === 'student'
              ? 'My Submitted Complaints'
              : mode === 'staff'
              ? 'Assigned Maintenance Work'
              : 'Campus Complaints Management'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {mode === 'student'
              ? 'Track the real-time status and assignment of your reported campus problems.'
              : mode === 'staff'
              ? 'Complaints currently assigned to your department queue for inspection and repair.'
              : 'Verify, prioritize, assign, and audit resolution progress across campus facilities.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'student' && onNavigateSubmit && (
            <button
              type="button"
              onClick={onNavigateSubmit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Issue</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadComplaints(pagination.page)}
            title="Refresh list"
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md text-neutral-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3.5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Search text */}
          <div className="relative md:col-span-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search #, title, location..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white text-neutral-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white text-neutral-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-hidden focus:border-orange-500 bg-white text-neutral-700"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
            <span>Filtered results active</span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content / Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title={hasActiveFilters ? 'No Matching Complaints' : 'No Complaints Found'}
          description={
            hasActiveFilters
              ? 'Try modifying or clearing your filters to view other complaints.'
              : mode === 'student'
              ? 'You have not submitted any complaints yet. Report a campus issue to get started.'
              : mode === 'staff'
              ? 'No complaints currently assigned to you. Checked back after verification.'
              : 'No complaints have been reported by students yet.'
          }
          actionText={
            hasActiveFilters
              ? 'Reset Filters'
              : mode === 'student' && onNavigateSubmit
              ? 'Submit First Complaint'
              : undefined
          }
          onAction={
            hasActiveFilters
              ? resetFilters
              : mode === 'student' && onNavigateSubmit
              ? onNavigateSubmit
              : undefined
          }
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-3 px-4 font-tabular">Number</th>
                  <th className="py-3 px-4">Title &amp; Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">
                    {mode === 'student' ? 'Assignee' : 'Reporter / Assignee'}
                  </th>
                  <th className="py-3 px-4 font-tabular">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectComplaint(c.id)}
                    className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-semibold text-neutral-900 font-tabular whitespace-nowrap">
                      {c.complaint_number}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-neutral-900 truncate">{c.title}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{c.location}</div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 whitespace-nowrap">{c.category}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                      {mode === 'student' ? (
                        <span>{c.assigned_staff_name || 'Pending assignment'}</span>
                      ) : (
                        <div>
                          <p className="font-medium text-neutral-800">{c.student_name}</p>
                          <p className="text-[10px] text-neutral-400">
                            {c.assigned_staff_name ? `→ ${c.assigned_staff_name}` : 'Unassigned'}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-tabular text-neutral-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectComplaint(c.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 group-hover:text-orange-600 group-hover:bg-orange-50 border border-neutral-200 group-hover:border-orange-200 rounded transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  FolderKanban,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { EmptyState } from '../common/EmptyState';

interface StaffDashboardProps {
  stats: {
    total_assigned: number;
    assigned: number;
    in_progress: number;
    resolved: number;
  };
  recentAssignments: any[];
  onNavigateList: () => void;
  onSelectComplaint: (id: number) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  stats,
  recentAssignments,
  onNavigateList,
  onSelectComplaint,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Staff Maintenance Workspace</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View assigned campus service requests, update task progress, and mark completed jobs.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateList}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs whitespace-nowrap cursor-pointer"
        >
          <FolderKanban className="w-4 h-4" />
          <span>View All Work Items</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Total Assigned</span>
            <FolderKanban className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">
            {stats.total_assigned}
          </div>
          <span className="text-[11px] text-neutral-400">All historical tasks</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Awaiting Start</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.assigned}</div>
          <span className="text-[11px] text-neutral-400">Assigned by admin</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>In Progress</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.in_progress}</div>
          <span className="text-[11px] text-neutral-400">Active maintenance</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.resolved}</div>
          <span className="text-[11px] text-neutral-400">Verified resolved</span>
        </div>
      </div>

      {/* Recent Assigned Items */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-neutral-900">Current Task Queue</h3>
            <span className="text-[11px] text-neutral-400 font-tabular">
              ({recentAssignments.length} active)
            </span>
          </div>
          {recentAssignments.length > 0 && (
            <button
              type="button"
              onClick={onNavigateList}
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              <span>View all work</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentAssignments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ListOrdered}
              title="No complaints assigned yet"
              description="Your maintenance queue is currently clear. When administrators assign tasks to your department, they will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recentAssignments.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                className="p-4 hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 font-tabular">
                      {c.complaint_number}
                    </span>
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <p className="font-medium text-neutral-800">{c.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    Location: <span className="font-medium text-neutral-700">{c.location}</span> ·
                    Reporter: {c.student_name}
                  </p>
                  {c.assignment_notes && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
                      Note: {c.assignment_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-neutral-400 font-tabular">
                    Assigned {new Date(c.assigned_date).toLocaleDateString()}
                  </span>
                  <span className="text-orange-600 font-semibold text-xs">Update Progress →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

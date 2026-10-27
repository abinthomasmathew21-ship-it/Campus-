import React from 'react';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';
import { Complaint } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { EmptyState } from '../common/EmptyState';

interface StudentDashboardProps {
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    rejected: number;
  };
  recentComplaints: Complaint[];
  onNavigateSubmit: () => void;
  onNavigateList: () => void;
  onSelectComplaint: (id: number) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  stats,
  recentComplaints,
  onNavigateSubmit,
  onNavigateList,
  onSelectComplaint,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Student Portal</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Report facility issues, track maintenance workflows, and confirm resolutions.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateSubmit}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Total Reported</span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.total}</div>
          <span className="text-[11px] text-neutral-400">All submissions</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.pending}</div>
          <span className="text-[11px] text-neutral-400">Awaiting admin verify</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>In Progress</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.in_progress}</div>
          <span className="text-[11px] text-neutral-400">Assigned / Servicing</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.resolved}</div>
          <span className="text-[11px] text-neutral-400">Service completed</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 font-tabular">{stats.rejected}</div>
          <span className="text-[11px] text-neutral-400">Declined with reason</span>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-neutral-900">Recent Complaints</h3>
            <span className="text-[11px] text-neutral-400 font-tabular">
              ({recentComplaints.length} recent)
            </span>
          </div>
          {recentComplaints.length > 0 && (
            <button
              type="button"
              onClick={onNavigateList}
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentComplaints.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={ListOrdered}
              title="No complaints submitted yet"
              description="You haven't reported any campus issues. Use the report button above if something needs maintenance."
              actionText="Submit First Complaint"
              onAction={onNavigateSubmit}
            />
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recentComplaints.map((c) => (
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
                    {c.category} · {c.location}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-neutral-400 font-tabular text-[11px]">
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  <span className="text-orange-600 font-medium">Details →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

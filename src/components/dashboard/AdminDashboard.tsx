import React from 'react';
import {
  FileText,
  Clock,
  Wrench,
  CheckCircle2,
  Users2,
  GraduationCap,
  Building2,
  ArrowRight,
  ListOrdered,
  History,
  ShieldAlert,
} from 'lucide-react';
import { Complaint, AuditLogItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { EmptyState } from '../common/EmptyState';

interface AdminDashboardProps {
  stats: {
    total_complaints: number;
    pending_verification: number;
    verified: number;
    active_resolution: number;
    resolved: number;
    rejected: number;
    total_students: number;
    total_staff: number;
    total_admins: number;
    total_departments: number;
  };
  categoryBreakdown: Array<{ category: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  recentComplaints: Complaint[];
  recentAudits: AuditLogItem[];
  onNavigateComplaints: () => void;
  onNavigateStaff: () => void;
  onNavigateDepartments: () => void;
  onNavigateAudit: () => void;
  onSelectComplaint: (id: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  categoryBreakdown,
  priorityBreakdown,
  recentComplaints,
  recentAudits,
  onNavigateComplaints,
  onNavigateStaff,
  onNavigateDepartments,
  onNavigateAudit,
  onSelectComplaint,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Campus Administration Console
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time facility management, verification, staff assignments, and database audit logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigateDepartments}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md transition-colors"
          >
            + Department
          </button>
          <button
            type="button"
            onClick={onNavigateStaff}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md transition-colors"
          >
            + Register Staff
          </button>
          <button
            type="button"
            onClick={onNavigateComplaints}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors shadow-xs"
          >
            Manage Complaints
          </button>
        </div>
      </div>

      {/* Main KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Total Reported</span>
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-xl font-bold text-neutral-900 font-tabular">
            {stats.total_complaints}
          </div>
          <span className="text-[10px] text-neutral-400">Campus-wide</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Needs Review</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-sky-700 font-tabular">
            {stats.pending_verification}
          </div>
          <span className="text-[10px] text-neutral-400">Submitted status</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>In Service</span>
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 font-tabular">
            {stats.active_resolution}
          </div>
          <span className="text-[10px] text-neutral-400">Active maintenance</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Resolved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 font-tabular">{stats.resolved}</div>
          <span className="text-[10px] text-neutral-400">Successful fixes</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Active Staff</span>
            <Users2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700 font-tabular">{stats.total_staff}</div>
          <span className="text-[10px] text-neutral-400">Registered staff</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Students</span>
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 font-tabular">
            {stats.total_students}
          </div>
          <span className="text-[10px] text-neutral-400">Registered accounts</span>
        </div>
      </div>

      {/* Two Column Section: Category Distribution & Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 mb-3 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-orange-600" />
            <span>Complaints by Category</span>
          </h3>

          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center italic">
              No complaint data available yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.map((item) => {
                const percentage = stats.total_complaints > 0
                  ? Math.round((item.count / stats.total_complaints) * 100)
                  : 0;
                return (
                  <div key={item.category} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-neutral-700">
                      <span className="font-medium">{item.category}</span>
                      <span className="font-tabular text-neutral-500">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-900 mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
            <span>Priority Distribution</span>
          </h3>

          {priorityBreakdown.length === 0 ? (
            <p className="text-xs text-neutral-400 py-6 text-center italic">
              No priority data available yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {priorityBreakdown.map((item) => {
                const percentage = stats.total_complaints > 0
                  ? Math.round((item.count / stats.total_complaints) * 100)
                  : 0;
                return (
                  <div key={item.priority} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-neutral-700">
                      <span className="font-semibold">{item.priority}</span>
                      <span className="font-tabular text-neutral-500">
                        {item.count} issues ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.priority === 'URGENT'
                            ? 'bg-rose-600'
                            : item.priority === 'HIGH'
                            ? 'bg-orange-500'
                            : item.priority === 'MEDIUM'
                            ? 'bg-blue-500'
                            : 'bg-neutral-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column: Recent Complaints & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Complaints */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-neutral-900">Recent Campus Complaints</h3>
              <span className="text-[11px] text-neutral-400 font-tabular">
                ({recentComplaints.length})
              </span>
            </div>
            {recentComplaints.length > 0 && (
              <button
                type="button"
                onClick={onNavigateComplaints}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                <span>View all complaints</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentComplaints.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ListOrdered}
                title="No complaints submitted yet"
                description="The database currently has 0 complaints. Submissions from students will appear here in real-time."
              />
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {recentComplaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint(c.id)}
                  className="p-3.5 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 font-tabular">
                        {c.complaint_number}
                      </span>
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <p className="font-semibold text-neutral-800 truncate">{c.title}</p>
                    <p className="text-[11px] text-neutral-500">
                      Reporter: {c.student_name} · {c.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-neutral-400 font-tabular block">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-orange-600 font-semibold text-xs hover:underline mt-0.5 inline-block">
                      Inspect →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-200 bg-neutral-50/50">
            <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span>Audit Trail</span>
            </h3>
            <button
              type="button"
              onClick={onNavigateAudit}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
            >
              Full Log
            </button>
          </div>

          {recentAudits.length === 0 ? (
            <p className="text-xs text-neutral-400 p-6 text-center italic">
              No audit records recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100 text-xs">
              {recentAudits.map((a) => (
                <div key={a.id} className="p-3">
                  <p className="font-medium text-neutral-800 leading-snug">{a.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 font-tabular">
                    <span>{a.user_name || 'System'}</span>
                    <span>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

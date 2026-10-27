import React, { useState, useEffect, useCallback } from 'react';
import { History, ShieldCheck, RefreshCw } from 'lucide-react';
import { AuditLogItem, Pagination } from '../../types';
import { api } from '../../services/api';
import { PaginationControls } from '../common/PaginationControls';
import { EmptyState } from '../common/EmptyState';
import { TableSkeleton } from '../common/LoadingSkeleton';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const fetchLogs = useCallback(async (pageToLoad = 1) => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs(pageToLoad, 20);
      if (res.success) {
        setLogs(res.logs);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">System Audit Trail</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Immutable log of all administrative, assignment, status change, and security operations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(pagination.page)}
          className="self-start sm:self-auto p-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md text-neutral-600 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit events recorded"
          description="System actions will be recorded here automatically as administrators, staff, and students perform actions."
        />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-3 px-4 font-tabular">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 font-tabular">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-tabular text-neutral-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-[11px] text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded font-mono">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {l.user_name ? (
                        <div>
                          <p className="font-medium text-neutral-900">{l.user_name}</p>
                          <p className="text-[10px] text-neutral-400">{l.user_email}</p>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-700 max-w-md">{l.description}</td>
                    <td className="py-3 px-4 font-tabular text-neutral-400 text-[11px] whitespace-nowrap">
                      {l.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls pagination={pagination} onPageChange={(p) => fetchLogs(p)} />
        </div>
      )}
    </div>
  );
};

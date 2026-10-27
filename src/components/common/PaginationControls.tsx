import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination } from '../../types';

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (newPage: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({ pagination, onPageChange }) => {
  const { page, totalPages, total, limit } = pagination;
  if (totalPages <= 1 && total <= limit) return null;

  const startIdx = Math.min((page - 1) * limit + 1, total);
  const endIdx = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-neutral-200 text-xs text-neutral-600">
      <div className="font-tabular">
        Showing <span className="font-semibold text-neutral-900">{total === 0 ? 0 : startIdx}</span> to{' '}
        <span className="font-semibold text-neutral-900">{endIdx}</span> of{' '}
        <span className="font-semibold text-neutral-900">{total}</span> records
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-2 font-tabular">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

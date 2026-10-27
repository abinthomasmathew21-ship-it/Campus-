import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white border border-neutral-200 rounded-lg overflow-hidden animate-pulse">
      <div className="h-10 bg-neutral-100 border-b border-neutral-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0">
          <div className="w-24 h-4 bg-neutral-200 rounded" />
          <div className="w-48 h-4 bg-neutral-200 rounded" />
          <div className="w-20 h-4 bg-neutral-200 rounded" />
          <div className="w-16 h-4 bg-neutral-200 rounded" />
          <div className="flex-1" />
          <div className="w-16 h-6 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 animate-pulse">
      <div className="w-28 h-4 bg-neutral-200 rounded mb-3" />
      <div className="w-16 h-8 bg-neutral-200 rounded mb-2" />
      <div className="w-36 h-3 bg-neutral-100 rounded" />
    </div>
  );
};

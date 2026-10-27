import React from 'react';
import { ComplaintPriority } from '../../types';

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  size?: 'sm' | 'md';
}

const priorityConfig: Record<ComplaintPriority, { label: string; text: string; bg: string; border: string }> = {
  LOW: {
    label: 'Low',
    text: 'text-neutral-600',
    bg: 'bg-neutral-100',
    border: 'border-neutral-200',
  },
  MEDIUM: {
    label: 'Medium',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  HIGH: {
    label: 'High',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  URGENT: {
    label: 'Urgent',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap`}
    >
      {config.label}
    </span>
  );
};

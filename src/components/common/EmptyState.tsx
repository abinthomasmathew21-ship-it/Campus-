import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white border border-neutral-200 rounded-lg">
      <div className="w-12 h-12 mb-3 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs transition-colors whitespace-nowrap"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

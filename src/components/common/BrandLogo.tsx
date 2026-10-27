import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2.5">
      {/* Abstract Campus + Care + Resolution Emblem */}
      <div
        className={`${iconSizes[size]} bg-orange-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4/5 h-4/5"
        >
          {/* Campus Gable Arch & Academic Structure */}
          <path d="M3 10L12 3L21 10" />
          <path d="M5 9.5V20C5 20.6 5.4 21 6 21H18C18.6 21 19 20.6 19 20V9.5" />
          {/* Care / Resolution Checkmark Heart Blend */}
          <path d="M9 14.5L11.5 17L16 11.5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-bold tracking-tight text-neutral-900 ${textSizes[size]} leading-none`}
        >
          CampusCare
        </span>
        {showTagline && (
          <span className="text-[11px] text-neutral-500 font-medium tracking-wide mt-0.5">
            Report. Track. Resolve.
          </span>
        )}
      </div>
    </div>
  );
};

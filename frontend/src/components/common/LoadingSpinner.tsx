import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string; fullPage?: boolean }> = ({
  label = 'Loading...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      {label && <p className="text-xs text-slate-500 font-medium">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

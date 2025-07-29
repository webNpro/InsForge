import React from 'react';

export function TableListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import RubricCard from './RubricCard';

export default function RubricList() {
  const rubrics = useAppStore((state) => state.rubrics);

  if (rubrics.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No rubrics created yet</p>
        <p className="text-sm mt-2">Click &quot;Create New Rubric&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rubrics.map((rubric) => (
        <RubricCard key={rubric.id} rubric={rubric} />
      ))}
    </div>
  );
}
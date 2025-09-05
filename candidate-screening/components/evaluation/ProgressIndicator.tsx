'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';

export default function ProgressIndicator() {
  const evaluationProgress = useAppStore((state) => state.evaluationProgress);

  if (!evaluationProgress) return null;

  const overallProgress = evaluationProgress.totalRubrics > 0
    ? ((evaluationProgress.currentRubricIndex + 
        (evaluationProgress.currentProfile / evaluationProgress.totalProfiles)) / 
        evaluationProgress.totalRubrics) * 100
    : 0;

  const currentRubricProgress = evaluationProgress.totalProfiles > 0
    ? (evaluationProgress.currentProfile / evaluationProgress.totalProfiles) * 100
    : 0;

  return (
    <div className="space-y-4 mb-6">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Overall Progress</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <Progress value={overallProgress} className="h-2 bg-purple-100" />
      </div>
      
      {evaluationProgress.currentRubric && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>
              Current Rubric: <span className="font-medium">{evaluationProgress.currentRubric}</span>
            </span>
            <span>
              {evaluationProgress.currentProfile}/{evaluationProgress.totalProfiles} profiles
            </span>
          </div>
          <Progress value={currentRubricProgress} className="h-2 bg-purple-100" />
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        Processing rubric {evaluationProgress.currentRubricIndex + 1} of {evaluationProgress.totalRubrics}
      </div>
    </div>
  );
}
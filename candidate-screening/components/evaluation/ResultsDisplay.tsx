'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import CompactProfileCard from '@/components/profile/CompactProfileCard';
import { Profile, EvaluationResult } from '@/types';

export default function ResultsDisplay() {
  const { evaluations, rubrics, profiles } = useAppStore();

  const rankedResults = useMemo(() => {
    const results: Array<{
      rubric: any;
      profiles: Array<{ profile: Profile; result: EvaluationResult }>;
    }> = [];
    
    rubrics.forEach((rubric) => {
      const rubricResults = evaluations.get(rubric.id) || [];
      
      // Sort profiles by average score (descending)
      const sortedProfiles = rubricResults
        .map(result => {
          const profile = profiles.find(p => p.id === result.profileId);
          return { profile, result };
        })
        .filter((item): item is { profile: Profile; result: EvaluationResult } => item.profile !== undefined)
        .sort((a, b) => b.result.averageScore - a.result.averageScore);
      
      if (sortedProfiles.length > 0) {
        results.push({
          rubric,
          profiles: sortedProfiles
        });
      }
    });
    
    return results;
  }, [evaluations, rubrics, profiles]);

  if (rankedResults.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No evaluation results available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h3 className="text-xl font-semibold mb-6">Evaluation Results</h3>
      
      {rankedResults.map(({ rubric, profiles: rubricProfiles }) => (
        <div key={rubric.id} className="space-y-4">
          <div className="border-b border-purple-200 pb-2">
            <h4 className="text-lg font-medium text-purple-700">
              {rubric.title}
            </h4>
            <p className="text-sm text-gray-600">
              Top {Math.min(rubricProfiles.length, 5)} candidates
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {rubricProfiles.slice(0, 5).map(({ profile, result }, index) => (
              <div key={profile.id} className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    #{index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <CompactProfileCard 
                    profile={profile} 
                    result={result}
                    rubric={rubric}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
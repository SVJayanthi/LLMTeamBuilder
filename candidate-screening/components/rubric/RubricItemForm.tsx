'use client';

import React from 'react';
import { RubricItem } from '@/types';

interface RubricItemFormProps {
  item: RubricItem;
  onChange: (item: RubricItem) => void;
}

export default function RubricItemForm({ item, onChange }: RubricItemFormProps) {
  const handleDescriptionChange = (description: string) => {
    onChange({ ...item, description });
  };

  const handleScoreDescriptionChange = (score: 1 | 2 | 3 | 4 | 5, description: string) => {
    onChange({
      ...item,
      scoreDescriptions: {
        ...item.scoreDescriptions,
        [score]: description,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 p-3 rounded-md border-2 border-purple-200">
        <label className="text-sm font-semibold text-purple-900 mb-2 block">Criteria Description</label>
        <textarea
          className="w-full px-3 py-2 border-2 border-purple-300 rounded-md resize-none bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
          placeholder="e.g., Years of relevant experience in software development"
          rows={2}
          value={item.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
        />
      </div>
      
      <div className="bg-purple-50 p-3 rounded-md border-2 border-purple-200">
        <label className="text-sm font-semibold text-purple-900 mb-3 block">Score Definitions</label>
        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as const).map((score) => (
            <div key={score} className="flex items-start gap-3 p-3 bg-white rounded-md border-2 border-purple-200">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                {score}
              </div>
              <input
                type="text"
                className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                placeholder={`Define what a score of ${score} means`}
                value={item.scoreDescriptions[score]}
                onChange={(e) => handleScoreDescriptionChange(score, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
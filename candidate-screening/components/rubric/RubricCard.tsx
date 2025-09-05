'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Rubric } from '@/types';

interface RubricCardProps {
  rubric: Rubric;
}

export default function RubricCard({ rubric }: RubricCardProps) {
  const deleteRubric = useAppStore((state) => state.deleteRubric);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the rubric "${rubric.title}"?`)) {
      deleteRubric(rubric.id);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 border-purple-200 hover:border-purple-300 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{rubric.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="space-y-3">
            {rubric.items.map((item, index) => (
              <div key={item.id} className="border-l-2 border-gray-200 pl-4">
                <p className="font-medium text-sm mb-1">
                  {index + 1}. {item.description}
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  {Object.entries(item.scoreDescriptions)
                    .filter(([, desc]) => desc)
                    .map(([score, desc]) => (
                      <div key={score}>
                        <span className="font-medium">Score {score}:</span> {desc}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
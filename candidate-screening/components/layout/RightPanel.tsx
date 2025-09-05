'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, StopCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import EvaluationRunner from '@/components/evaluation/EvaluationRunner';
import ProgressIndicator from '@/components/evaluation/ProgressIndicator';
import ResultsDisplay from '@/components/evaluation/ResultsDisplay';

export default function RightPanel() {
  const { isEvaluating, rubrics, profiles, startEvaluation, stopEvaluation } = useAppStore();
  const [showResults, setShowResults] = React.useState(false);

  const handleRunEvaluation = () => {
    if (rubrics.length === 0) {
      alert('Please create at least one rubric before running evaluation.');
      return;
    }
    
    if (profiles.length === 0) {
      alert('No profiles available for evaluation.');
      return;
    }
    
    setShowResults(false);
    startEvaluation();
  };

  const handleStopEvaluation = () => {
    stopEvaluation();
  };

  const handleEvaluationComplete = () => {
    setShowResults(true);
  };

  return (
    <div className="w-1/3 h-full border-r-2 border-purple-300 bg-white/90 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-800">Evaluation Runner</h2>
        
        {!isEvaluating ? (
          <Button 
            onClick={handleRunEvaluation}
            className="w-full"
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Run Evaluation
          </Button>
        ) : (
          <Button 
            onClick={handleStopEvaluation}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Stop Evaluation
          </Button>
        )}
      </div>
      
      {isEvaluating && (
        <>
          <ProgressIndicator />
          <EvaluationRunner onComplete={handleEvaluationComplete} />
        </>
      )}
      
      {showResults && !isEvaluating && (
        <ResultsDisplay />
      )}
      
      {!isEvaluating && !showResults && rubrics.length > 0 && (
        <div className="text-center text-gray-500 mt-12">
          <p>Click &quot;Run Evaluation&quot; to start screening candidates</p>
          <p className="text-sm mt-2">
            {rubrics.length} rubric{rubrics.length !== 1 ? 's' : ''} created • 
            {' '}{profiles.length} profile{profiles.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
      )}
      
      {!isEvaluating && !showResults && rubrics.length === 0 && (
        <div className="text-center text-gray-500 mt-12">
          <p>Create at least one rubric to begin evaluation</p>
        </div>
      )}
    </div>
  );
}
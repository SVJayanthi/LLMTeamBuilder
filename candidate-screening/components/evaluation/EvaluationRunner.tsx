'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { EvaluationResult } from '@/types';

interface EvaluationRunnerProps {
  onComplete: () => void;
}

export default function EvaluationRunner({ onComplete }: EvaluationRunnerProps) {
  const isRunningRef = useRef(false);
  const { isEvaluating } = useAppStore();

  useEffect(() => {
    if (!isEvaluating || isRunningRef.current) return;

    isRunningRef.current = true;

    const runEvaluations = async () => {
      try {
        const store = useAppStore.getState();
        const { profiles, rubrics, updateProgress, setEvaluationResults, stopEvaluation } = store;

        for (let rubricIndex = 0; rubricIndex < rubrics.length; rubricIndex++) {
          const rubric = rubrics[rubricIndex];
          const rubricResults: EvaluationResult[] = [];

          // Update progress for this rubric
          updateProgress({
            currentRubric: rubric.title,
            currentRubricIndex: rubricIndex,
            totalRubrics: rubrics.length,
            currentProfile: 0,
            totalProfiles: profiles.length,
            completedRubrics: rubrics.slice(0, rubricIndex).map(r => r.id),
          });

          // Use concurrent evaluation for all profiles in this rubric
          console.log(`🚀 Starting concurrent evaluation of ${profiles.length} profiles for rubric: ${rubric.title}`);
          
          try {
            const response = await fetch('/api/evaluate-concurrent?stream=1', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson',
              },
              body: JSON.stringify({ 
                profiles, 
                rubric,
              }),
            });

            if (!response.ok) {
              throw new Error(`Concurrent evaluation failed: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/x-ndjson')) {
              const body = response.body;
              if (!body) {
                // Fallback to JSON if stream body is unexpectedly null
                const result = await response.json();
                rubricResults.push(...result.results);
                updateProgress({ currentProfile: profiles.length });
                console.log(`✅ Completed concurrent evaluation for rubric ${rubric.title}: ${result.results.length} profiles evaluated in ${(result.totalTime / 1000).toFixed(2)}s with ${result.actualSpeedup.toFixed(2)}x speedup`);
                return;
              }
              const reader = body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let doneMeta: { totalTime?: number; actualSpeedup?: number } | null = null;

              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                  if (!line.trim()) continue;
                  const evt = JSON.parse(line);
                  if (evt.type === 'start') {
                    updateProgress({ totalProfiles: evt.total });
                  } else if (evt.type === 'result') {
                    const r: EvaluationResult = {
                      ...evt.result,
                      evaluatedAt: new Date(evt.result.evaluatedAt),
                    };
                    rubricResults.push(r);
                    updateProgress({ currentProfile: evt.completed });
                  } else if (evt.type === 'done') {
                    doneMeta = { totalTime: evt.totalTime, actualSpeedup: evt.actualSpeedup };
                  } else if (evt.type === 'error') {
                    throw new Error(evt.message || 'Stream error');
                  }
                }
              }

              // Process any remaining buffered line
              if (buffer.trim()) {
                try {
                  const evt = JSON.parse(buffer);
                  if (evt.type === 'done') {
                    doneMeta = { totalTime: evt.totalTime, actualSpeedup: evt.actualSpeedup };
                  }
                } catch {}
              }

              // Ensure progress shows full completion
              updateProgress({ currentProfile: profiles.length });

              if (doneMeta) {
                console.log(`✅ Completed concurrent evaluation for rubric ${rubric.title}: ${rubricResults.length} profiles evaluated in ${((doneMeta.totalTime || 0) / 1000).toFixed(2)}s with ${(doneMeta.actualSpeedup || 0).toFixed(2)}x speedup`);
              } else {
                console.log(`✅ Completed concurrent evaluation for rubric ${rubric.title}: ${rubricResults.length} profiles evaluated`);
              }
            } else {
              // Fallback to JSON response
              const result = await response.json();
              rubricResults.push(...result.results);
              updateProgress({ currentProfile: profiles.length });
              console.log(`✅ Completed concurrent evaluation for rubric ${rubric.title}: ${result.results.length} profiles evaluated in ${(result.totalTime / 1000).toFixed(2)}s with ${result.actualSpeedup.toFixed(2)}x speedup`);
            }
          } catch (error) {
            console.error(`Error in concurrent evaluation for rubric ${rubric.title}:`, error);
            // Fallback to individual evaluation if concurrent fails
            console.log('🔄 Falling back to individual evaluation...');
            
            for (let profileIndex = 0; profileIndex < profiles.length; profileIndex++) {
              const profile = profiles[profileIndex];
              
              // Update progress for this profile
              updateProgress({
                currentProfile: profileIndex + 1,
              });

              try {
                const response = await fetch('/api/evaluate', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ profile, rubric }),
                });

                if (!response.ok) {
                  throw new Error(`Evaluation failed: ${response.statusText}`);
                }

                const result: EvaluationResult = await response.json();
                rubricResults.push(result);
              } catch (error) {
                console.error(`Error evaluating profile ${profile.name}:`, error);
                // Continue with next profile even if one fails
              }

              // Check if evaluation was stopped
              const currentState = useAppStore.getState();
              if (!currentState.isEvaluating) {
                isRunningRef.current = false;
                return;
              }
            }
          }

          // Check if evaluation was stopped after concurrent evaluation
          const currentState = useAppStore.getState();
          if (!currentState.isEvaluating) {
            isRunningRef.current = false;
            return;
          }

          setEvaluationResults(rubric.id, rubricResults);
        }

        // All evaluations complete
        const finalStore = useAppStore.getState();
        finalStore.updateProgress({
          completedRubrics: rubrics.map(r => r.id),
          currentRubricIndex: rubrics.length,
        });
        
        finalStore.stopEvaluation();
        isRunningRef.current = false;
        onComplete();
      } catch (error) {
        console.error('Evaluation runner error:', error);
        const store = useAppStore.getState();
        store.stopEvaluation();
        isRunningRef.current = false;
      }
    };

    runEvaluations();
  }, [isEvaluating, onComplete]);

  // Reset the ref when evaluation stops
  useEffect(() => {
    if (!isEvaluating && isRunningRef.current) {
      isRunningRef.current = false;
    }
  }, [isEvaluating]);

  return null; // This component doesn't render anything
}
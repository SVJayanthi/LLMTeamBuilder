import { NextRequest, NextResponse } from 'next/server';
import { evaluateProfileBatch } from '@/lib/openai';
import { Profile, Rubric, EvaluationResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { profiles, rubric }: { profiles: Profile[]; rubric: Rubric } = await request.json();
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one profile is required' },
        { status: 400 }
      );
    }
    
    // OPTIMIZATION 2: Use batching - evaluate multiple profiles in one call
    const batchResults = await evaluateProfileBatch(profiles, rubric);
    
    // Transform batch results to individual evaluation results
    const evaluationResults: EvaluationResult[] = batchResults.map((batchResult) => {
      const scores = rubric.items.map((item) => ({
        itemId: item.id,
        score: batchResult.evaluation[item.id].score,
        explanation: batchResult.evaluation[item.id].explanation,
      }));
      
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      const averageScore = totalScore / scores.length;
      
      return {
        profileId: batchResult.profileId,
        rubricId: rubric.id,
        scores,
        totalScore,
        averageScore,
        evaluatedAt: new Date(),
      };
    });
    
    return NextResponse.json({
      results: evaluationResults,
      batchSize: profiles.length,
      optimization: 'batching'
    });
  } catch (error) {
    console.error('Batch evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate profiles in batch' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { evaluateProfileWithAllRubricItems } from '@/lib/openai';
import { Profile, Rubric, EvaluationResult } from '@/types';

// Rate limiter to control concurrency
class RateLimiter {
  private maxConcurrent: number;
  private delayMs: number;
  private running: number = 0;
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(maxConcurrent = 5, delayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift()!;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      // Add small delay to respect rate limits
      setTimeout(() => this.processQueue(), this.delayMs);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profiles, rubric, maxConcurrent = 5 }: { 
      profiles: Profile[]; 
      rubric: Rubric; 
      maxConcurrent?: number; 
    } = await request.json();
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one profile is required' },
        { status: 400 }
      );
    }
    
    console.log(`Starting concurrent evaluation of ${profiles.length} profiles with max concurrent: ${maxConcurrent}`);
    
    // OPTIMIZATION 3: Use concurrency with rate limiting
    const rateLimiter = new RateLimiter(maxConcurrent, 50);
    const startTime = Date.now();
    
    // Create evaluation tasks for all profiles
    const evaluationTasks = profiles.map((profile, index) => {
      return rateLimiter.execute(async () => {
        console.log(`Starting evaluation for profile ${index + 1}/${profiles.length}: ${profile.name}`);
        const profileStartTime = Date.now();
        
        const evaluation = await evaluateProfileWithAllRubricItems(profile, rubric);
        
        const profileEndTime = Date.now();
        const evaluationTime = profileEndTime - profileStartTime;
        
        // Transform to match EvaluationResult format
        const scores = rubric.items.map((item) => ({
          itemId: item.id,
          score: evaluation[item.id].score,
          explanation: evaluation[item.id].explanation,
        }));
        
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
        const averageScore = totalScore / scores.length;
        
        console.log(`Completed profile ${index + 1}: ${profile.name} - Score: ${totalScore}/${rubric.items.length * 5} (avg: ${averageScore.toFixed(2)}) - Time: ${evaluationTime}ms`);
        
        const result: EvaluationResult = {
          profileId: profile.id,
          rubricId: rubric.id,
          scores,
          totalScore,
          averageScore,
          evaluatedAt: new Date(),
        };
        
        return {
          ...result,
          profileName: profile.name,
          evaluationTime
        };
      });
    });
    
    // Execute all evaluations concurrently
    console.log(`Executing concurrent evaluation of ${profiles.length} profiles...`);
    const results = await Promise.all(evaluationTasks);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Calculate actual speedup
    const totalSequentialTime = results.reduce((sum, result) => sum + result.evaluationTime, 0);
    const actualSpeedup = totalSequentialTime / totalTime;
    
    console.log(`Concurrent evaluation completed in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`Actual speedup achieved: ${actualSpeedup.toFixed(2)}x`);
    
    return NextResponse.json({
      results: results.map(r => ({
        profileId: r.profileId,
        rubricId: r.rubricId,
        scores: r.scores,
        totalScore: r.totalScore,
        averageScore: r.averageScore,
        evaluatedAt: r.evaluatedAt
      })),
      totalTime,
      maxConcurrent,
      actualSpeedup,
      optimization: 'concurrency'
    });
  } catch (error) {
    console.error('Concurrent evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate profiles concurrently' },
      { status: 500 }
    );
  }
}
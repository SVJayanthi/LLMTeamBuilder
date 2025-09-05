import { NextRequest, NextResponse } from 'next/server';
import { 
  evaluateProfileWithAllRubricItems, 
  evaluateProfileBatch,
  BatchEvaluationResult 
} from '@/lib/openai';
import { Profile, Rubric, EvaluationResult } from '@/types';

// Rate limiter for concurrency control
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
      setTimeout(() => this.processQueue(), this.delayMs);
    }
  }
}

function transformToEvaluationResult(
  profileId: string,
  profileName: string | undefined,
  rubricId: string,
  evaluation: { [itemId: string]: { score: number; explanation: string } },
  rubric: Rubric
): EvaluationResult & { profileName?: string } {
  const scores = rubric.items.map((item) => ({
    itemId: item.id,
    score: evaluation[item.id].score,
    explanation: evaluation[item.id].explanation,
  }));
  
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const averageScore = totalScore / scores.length;
  
  return {
    profileId,
    rubricId,
    scores,
    totalScore,
    averageScore,
    evaluatedAt: new Date(),
    profileName
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle different request formats for all optimizations
    if (body.profile && body.rubric) {
      // OPTIMIZATION 1: Single profile evaluation with prompt redesign
      return await handleSingleProfile(body.profile, body.rubric);
    } else if (body.profiles && body.rubric) {
      // Multiple profiles - choose optimization based on request parameters
      const { profiles, rubric, optimization = 'auto', batchSize = 5, maxConcurrent = 5 } = body;
      
      if (profiles.length === 0) {
        return NextResponse.json(
          { error: 'At least one profile is required' },
          { status: 400 }
        );
      }
      
      // Auto-select optimization based on profile count and preferences
      let selectedOptimization = optimization;
      if (optimization === 'auto') {
        if (profiles.length <= 3) {
          selectedOptimization = 'concurrency'; // Best for small sets
        } else if (profiles.length <= 10) {
          selectedOptimization = 'batching'; // Most cost-effective for medium sets
        } else {
          selectedOptimization = 'concurrency'; // Best performance for large sets
        }
      }
      
      switch (selectedOptimization) {
        case 'batching':
          return await handleBatchEvaluation(profiles, rubric, batchSize);
        case 'concurrency':
          return await handleConcurrentEvaluation(profiles, rubric, maxConcurrent);
        case 'prompt-redesign':
          return await handleSequentialEvaluation(profiles, rubric);
        default:
          return NextResponse.json(
            { error: 'Invalid optimization type. Use: prompt-redesign, batching, concurrency, or auto' },
            { status: 400 }
          );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request format. Provide either {profile, rubric} or {profiles, rubric}' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate profile(s)' },
      { status: 500 }
    );
  }
}

// OPTIMIZATION 1: Single profile with prompt redesign
async function handleSingleProfile(profile: Profile, rubric: Rubric) {
  console.log(`🔍 Using Optimization 1: Prompt Redesign for profile ${profile.name}`);
  
  const evaluationResults = await evaluateProfileWithAllRubricItems(profile, rubric);
  const result = transformToEvaluationResult(profile.id, profile.name, rubric.id, evaluationResults, rubric);
  
  return NextResponse.json({
    ...result,
    optimization: 'prompt-redesign',
    profileCount: 1
  });
}

// OPTIMIZATION 2: Batching multiple profiles
async function handleBatchEvaluation(profiles: Profile[], rubric: Rubric, batchSize: number) {
  console.log(`📦 Using Optimization 2: Batching ${profiles.length} profiles (batch size: ${batchSize})`);
  
  const startTime = Date.now();
  const results: EvaluationResult[] = [];
  let totalAPICalls = 0;
  
  // Process profiles in batches
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, Math.min(i + batchSize, profiles.length));
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: profiles ${i + 1}-${i + batch.length}`);
    
    const batchResults = await evaluateProfileBatch(batch, rubric);
    totalAPICalls++;
    
    // Transform batch results to evaluation results
    for (const batchResult of batchResults) {
      const profile = batch.find(p => p.id === batchResult.profileId);
      const result = transformToEvaluationResult(
        batchResult.profileId, 
        profile?.name, 
        rubric.id, 
        batchResult.evaluation, 
        rubric
      );
      results.push(result);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  return NextResponse.json({
    results: results.sort((a, b) => b.averageScore - a.averageScore),
    totalTime,
    profileCount: profiles.length,
    batchSize,
    totalAPICalls,
    averageProfilesPerCall: profiles.length / totalAPICalls,
    optimization: 'batching'
  });
}

// OPTIMIZATION 3: Concurrent evaluation
async function handleConcurrentEvaluation(profiles: Profile[], rubric: Rubric, maxConcurrent: number) {
  console.log(`⚡ Using Optimization 3: Concurrency for ${profiles.length} profiles (max concurrent: ${maxConcurrent})`);
  
  const startTime = Date.now();
  const rateLimiter = new RateLimiter(maxConcurrent, 50);
  
  // Create evaluation tasks for all profiles
  const evaluationTasks = profiles.map((profile, index) => {
    return rateLimiter.execute(async () => {
      console.log(`Starting evaluation for profile ${index + 1}/${profiles.length}: ${profile.name}`);
      const profileStartTime = Date.now();
      
      const evaluation = await evaluateProfileWithAllRubricItems(profile, rubric);
      const profileEndTime = Date.now();
      const evaluationTime = profileEndTime - profileStartTime;
      
      const result = transformToEvaluationResult(profile.id, profile.name, rubric.id, evaluation, rubric);
      
      console.log(`Completed profile ${index + 1}: ${profile.name} - Score: ${result.totalScore}/${rubric.items.length * 5} (avg: ${result.averageScore.toFixed(2)}) - Time: ${evaluationTime}ms`);
      
      return {
        ...result,
        evaluationTime
      };
    });
  });
  
  // Execute all evaluations concurrently
  const results = await Promise.all(evaluationTasks);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Calculate actual speedup
  const totalSequentialTime = results.reduce((sum, result) => sum + result.evaluationTime, 0);
  const actualSpeedup = totalSequentialTime / totalTime;
  
  console.log(`Concurrent evaluation completed in ${totalTime}ms with ${actualSpeedup.toFixed(2)}x speedup`);
  
  return NextResponse.json({
    results: results.map(r => ({
      profileId: r.profileId,
      rubricId: r.rubricId,
      scores: r.scores,
      totalScore: r.totalScore,
      averageScore: r.averageScore,
      evaluatedAt: r.evaluatedAt
    })).sort((a, b) => b.averageScore - a.averageScore),
    totalTime,
    profileCount: profiles.length,
    maxConcurrent,
    actualSpeedup,
    optimization: 'concurrency'
  });
}

// Sequential evaluation using prompt redesign (Optimization 1 for multiple profiles)
async function handleSequentialEvaluation(profiles: Profile[], rubric: Rubric) {
  console.log(`🔄 Using Optimization 1 (Sequential): Prompt Redesign for ${profiles.length} profiles`);
  
  const startTime = Date.now();
  const results: EvaluationResult[] = [];
  
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    console.log(`Evaluating profile ${i + 1}/${profiles.length}: ${profile.name}`);
    
    const evaluationResults = await evaluateProfileWithAllRubricItems(profile, rubric);
    const result = transformToEvaluationResult(profile.id, profile.name, rubric.id, evaluationResults, rubric);
    results.push(result);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  return NextResponse.json({
    results: results.sort((a, b) => b.averageScore - a.averageScore),
    totalTime,
    profileCount: profiles.length,
    totalAPICalls: profiles.length,
    optimization: 'prompt-redesign'
  });
}
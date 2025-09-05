import { NextRequest, NextResponse } from 'next/server';
import { evaluateProfileBatch } from '@/lib/openai';
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
    const { profiles, rubric, maxConcurrent = 200, batchSize = 5 }: { 
      profiles: Profile[]; 
      rubric: Rubric; 
      maxConcurrent?: number; 
      batchSize?: number;
    } = await request.json();
    
    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: 'At least one profile is required' },
        { status: 400 }
      );
    }
    
    console.log(`Starting concurrent evaluation of ${profiles.length} profiles with max concurrent: ${maxConcurrent}, batch size: ${batchSize}`);
    
    // Check if client requested streaming progress (NDJSON)
    const url = new URL(request.url);
    const wantsStream = url.searchParams.get('stream') === '1' ||
      (request.headers.get('accept') || '').includes('application/x-ndjson');

    // OPTIMIZATION 3: Use concurrency with rate limiting
    const rateLimiter = new RateLimiter(maxConcurrent, 50);
    const startTime = Date.now();
    const totalBatches = Math.ceil(profiles.length / batchSize);
    console.log(`Batching ${profiles.length} profiles into ${totalBatches} batch(es) of up to ${batchSize} profiles each (maxConcurrent batches: ${maxConcurrent}).`);

    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          (async () => {
            try {
              // Send start event
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'start', total: profiles.length, maxConcurrent, batchSize }) + '\n')
              );

              let completed = 0;
              const results: Array<{
                profileId: string;
                rubricId: string;
                scores: EvaluationResult['scores'];
                totalScore: number;
                averageScore: number;
                evaluatedAt: Date;
                evaluationTime: number;
              }> = [];

              const tasks: Array<Promise<void>> = [];
              for (let i = 0; i < profiles.length; i += batchSize) {
                const startIdx = i;
                const batch = profiles.slice(i, Math.min(i + batchSize, profiles.length));
                tasks.push(
                  rateLimiter.execute(async () => {
                    const batchNumber = Math.floor(startIdx / batchSize) + 1;
                    console.log(`Starting batch ${batchNumber}/${totalBatches} (stream): profiles ${startIdx + 1}-${startIdx + batch.length} (size ${batch.length})`);
                    const batchStart = Date.now();
                    const batchResults = await evaluateProfileBatch(batch, rubric);
                    const batchEnd = Date.now();
                    const batchTime = batchEnd - batchStart;
                    console.log(`Completed batch ${batchNumber}/${totalBatches} (stream) in ${batchTime}ms`);

                    for (let k = 0; k < batchResults.length; k++) {
                      const br = batchResults[k];
                      const globalIndex = startIdx + k;

                      const scores = rubric.items.map((item) => ({
                        itemId: item.id,
                        score: br.evaluation[item.id]?.score ?? 3,
                        explanation: br.evaluation[item.id]?.explanation ?? 'No explanation provided',
                      }));
                      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
                      const averageScore = totalScore / scores.length;

                      const result: EvaluationResult = {
                        profileId: br.profileId,
                        rubricId: rubric.id,
                        scores,
                        totalScore,
                        averageScore,
                        evaluatedAt: new Date(),
                      };

                      results.push({
                        profileId: result.profileId,
                        rubricId: result.rubricId,
                        scores: result.scores,
                        totalScore: result.totalScore,
                        averageScore: result.averageScore,
                        evaluatedAt: result.evaluatedAt,
                        evaluationTime: Math.max(1, Math.round(batchTime / Math.max(1, batchResults.length))),
                      });

                      completed += 1;
                      controller.enqueue(
                        encoder.encode(
                          JSON.stringify({
                            type: 'result',
                            index: globalIndex,
                            profileId: result.profileId,
                            profileName: br.profileName,
                            evaluationTime: Math.max(1, Math.round(batchTime / Math.max(1, batchResults.length))),
                            completed,
                            total: profiles.length,
                            result,
                          }) + '\n'
                        )
                      );
                    }
                  })
                );
              }

              await Promise.all(tasks);

              const endTime = Date.now();
              const totalTime = endTime - startTime;
              const totalSequentialTime = results.reduce((sum, r) => sum + r.evaluationTime, 0);
              const actualSpeedup = totalSequentialTime / totalTime;

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'done', totalTime, maxConcurrent, actualSpeedup }) + '\n'
                )
              );
              controller.close();
            } catch (err: any) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'error', message: err?.message || 'Unknown error' }) + '\n'
                )
              );
              controller.close();
            }
          })();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Fallback to JSON response (no streaming requested)
    // Create batched evaluation tasks for all profiles
    const batchTasks: Array<Promise<{
      items: Array<{
        profileId: string;
        rubricId: string;
        scores: EvaluationResult['scores'];
        totalScore: number;
        averageScore: number;
        evaluatedAt: Date;
        evaluationTime: number;
      }>;
      batchTime: number;
    }>> = [];

    for (let i = 0; i < profiles.length; i += batchSize) {
      const startIdx = i;
      const batch = profiles.slice(i, Math.min(i + batchSize, profiles.length));
      batchTasks.push(
        rateLimiter.execute(async () => {
          const batchNumber = Math.floor(startIdx / batchSize) + 1;
          console.log(`Starting batch ${batchNumber}/${totalBatches} (json): profiles ${startIdx + 1}-${startIdx + batch.length} (size ${batch.length})`);
          const batchStart = Date.now();
          const batchResults = await evaluateProfileBatch(batch, rubric);
          const batchEnd = Date.now();
          const batchTime = batchEnd - batchStart;
          console.log(`Completed batch ${batchNumber}/${totalBatches} (json) in ${batchTime}ms`);

          const items = batchResults.map((br) => {
            const scores = rubric.items.map((item) => ({
              itemId: item.id,
              score: br.evaluation[item.id]?.score ?? 3,
              explanation: br.evaluation[item.id]?.explanation ?? 'No explanation provided',
            }));
            const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
            const averageScore = totalScore / scores.length;

            const result: EvaluationResult = {
              profileId: br.profileId,
              rubricId: rubric.id,
              scores,
              totalScore,
              averageScore,
              evaluatedAt: new Date(),
            };

            return {
              ...result,
              evaluationTime: Math.max(1, Math.round(batchTime / Math.max(1, batchResults.length))),
            };
          });

          return { items, batchTime };
        })
      );
    }
    
    console.log(`Executing batched concurrent evaluation of ${profiles.length} profiles (batch size ${batchSize})...`);
    const batchOutputs = await Promise.all(batchTasks);
    const results = batchOutputs.flatMap(o => o.items);
    
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
#!/usr/bin/env node

/**
 * Script 3: Concurrency - Run multiple LLM inferences simultaneously
 * This script optimizes by running multiple LLM calls concurrently with rate limiting
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sample rubric for testing
const sampleRubric = {
  id: 'tech-eval-1',
  title: 'Technical Evaluation',
  items: [
    {
      id: 'experience',
      description: 'Technical Experience and Expertise',
      scoreDescriptions: {
        1: 'No relevant technical experience',
        2: 'Limited technical experience, mostly junior roles',
        3: 'Moderate technical experience with some senior responsibilities',
        4: 'Strong technical experience with leadership roles',
        5: 'Exceptional technical experience with principal/architect level roles'
      }
    },
    {
      id: 'education',
      description: 'Educational Background',
      scoreDescriptions: {
        1: 'No relevant technical education',
        2: 'Some technical education or certifications',
        3: 'Bachelor\'s degree in technical field',
        4: 'Advanced degree in technical field or top-tier university',
        5: 'PhD or exceptional educational credentials from top institutions'
      }
    },
    {
      id: 'skills',
      description: 'Technical Skills Relevance',
      scoreDescriptions: {
        1: 'No relevant technical skills listed',
        2: 'Few relevant technical skills',
        3: 'Good set of relevant technical skills',
        4: 'Strong technical skills with modern technologies',
        5: 'Exceptional technical skills with cutting-edge expertise'
      }
    }
  ]
};

// Rate limiter class to manage concurrent requests
class RateLimiter {
  constructor(maxConcurrent = 5, delayMs = 100) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

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

async function evaluateProfileWithAllRubricItems(profile, rubric) {
  const rubricItemsText = rubric.items.map(item => `
${item.id.toUpperCase()}: ${item.description}
Scoring Guide:
1: ${item.scoreDescriptions[1]}
2: ${item.scoreDescriptions[2]}
3: ${item.scoreDescriptions[3]}
4: ${item.scoreDescriptions[4]}
5: ${item.scoreDescriptions[5]}
`).join('\n');

  const prompt = `
Evaluate the following candidate profile based on ALL rubric items below:

Profile:
${JSON.stringify(profile, null, 2)}

RUBRIC ITEMS:
${rubricItemsText}

Return a JSON object with scores for ALL rubric items:
{
  "${rubric.items[0].id}": {
    "score": [1-5],
    "explanation": "detailed explanation for the score"
  },
  "${rubric.items[1].id}": {
    "score": [1-5],
    "explanation": "detailed explanation for the score"
  },
  "${rubric.items[2].id}": {
    "score": [1-5],
    "explanation": "detailed explanation for the score"
  }
}

Only return valid JSON, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recruiter evaluating candidate profiles. Return only valid JSON responses with scores for all rubric items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    // Validate and normalize scores
    const normalizedResult = {};
    for (const item of rubric.items) {
      if (result[item.id]) {
        normalizedResult[item.id] = {
          score: Math.max(1, Math.min(5, Math.round(result[item.id].score))),
          explanation: result[item.id].explanation || 'No explanation provided'
        };
      } else {
        normalizedResult[item.id] = {
          score: 3,
          explanation: 'Unable to evaluate this item. Default score assigned.'
        };
      }
    }
    
    return normalizedResult;
  } catch (error) {
    console.error('Error evaluating profile:', error);
    // Return default scores for all items
    const defaultResult = {};
    for (const item of rubric.items) {
      defaultResult[item.id] = {
        score: 3,
        explanation: 'Unable to evaluate due to an error. Default score assigned.'
      };
    }
    return defaultResult;
  }
}

async function runEvaluation(profileCount, maxConcurrent = 5) {
  console.log(`\n=== Script 3: Concurrency - Testing with ${profileCount} profiles (max concurrent: ${maxConcurrent}) ===`);
  
  // Load profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, profileCount);
  
  console.log(`Loaded ${profiles.length} profiles`);
  console.log(`Rubric has ${sampleRubric.items.length} items`);
  console.log(`Max concurrent requests: ${maxConcurrent}`);
  
  const startTime = Date.now();
  const rateLimiter = new RateLimiter(maxConcurrent, 50); // 50ms delay between batches
  
  // Create evaluation tasks for all profiles
  const evaluationTasks = profiles.map((profile, index) => {
    return rateLimiter.execute(async () => {
      console.log(`Starting evaluation for profile ${index + 1}/${profiles.length}: ${profile.name}`);
      const profileStartTime = Date.now();
      
      const evaluation = await evaluateProfileWithAllRubricItems(profile, sampleRubric);
      
      const profileEndTime = Date.now();
      const evaluationTime = profileEndTime - profileStartTime;
      
      // Calculate total score
      const scores = Object.values(evaluation).map(item => item.score);
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      
      console.log(`Completed profile ${index + 1}: ${profile.name} - Score: ${totalScore}/${sampleRubric.items.length * 5} (avg: ${averageScore.toFixed(2)}) - Time: ${evaluationTime}ms`);
      
      return {
        profileId: profile.id,
        profileName: profile.name,
        rubricId: sampleRubric.id,
        evaluation,
        totalScore,
        averageScore,
        evaluationTime
      };
    });
  });
  
  // Execute all evaluations concurrently
  console.log(`\nStarting concurrent evaluation of ${profiles.length} profiles...`);
  const results = await Promise.all(evaluationTasks);
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n--- Results Summary ---`);
  console.log(`Total profiles evaluated: ${results.length}`);
  console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`Average time per profile: ${(totalTime / results.length).toFixed(2)}ms`);
  console.log(`Total LLM calls: ${results.length} (1 per profile)`);
  console.log(`Max concurrent requests: ${maxConcurrent}`);
  console.log(`Theoretical speedup vs sequential: ${Math.min(maxConcurrent, results.length)}x`);
  
  // Calculate actual speedup by comparing individual evaluation times
  const totalSequentialTime = results.reduce((sum, result) => sum + result.evaluationTime, 0);
  const actualSpeedup = totalSequentialTime / totalTime;
  console.log(`Actual speedup achieved: ${actualSpeedup.toFixed(2)}x`);
  
  // Show top 3 candidates
  const sortedResults = results.sort((a, b) => b.averageScore - a.averageScore);
  console.log(`\nTop 3 candidates:`);
  for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
    const result = sortedResults[i];
    console.log(`${i + 1}. ${result.profileName} - Score: ${result.averageScore.toFixed(2)}`);
  }
  
  return {
    totalTime,
    averageTimePerProfile: totalTime / results.length,
    totalLLMCalls: results.length,
    maxConcurrent,
    actualSpeedup,
    results: sortedResults
  };
}

async function main() {
  try {
    // Test with different profile counts and concurrency levels
    const testConfigs = [
      { profiles: 5, concurrent: 3 },
      { profiles: 5, concurrent: 5 },
      { profiles: 10, concurrent: 5 },
      { profiles: 10, concurrent: 8 },
      { profiles: 50, concurrent: 8 },
      { profiles: 50, concurrent: 10 }
    ];
    
    const allResults = {};
    
    for (const config of testConfigs) {
      const key = `${config.profiles}p_${config.concurrent}c`;
      allResults[key] = await runEvaluation(config.profiles, config.concurrent);
      
      // Add a small delay between tests
      if (config !== testConfigs[testConfigs.length - 1]) {
        console.log('\nWaiting 3 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Summary comparison
    console.log('\n=== PERFORMANCE COMPARISON ===');
    console.log('Config       | Total Time | Avg Time/Profile | LLM Calls | Speedup');
    console.log('-------------|------------|------------------|-----------|--------');
    for (const config of testConfigs) {
      const key = `${config.profiles}p_${config.concurrent}c`;
      const result = allResults[key];
      console.log(`${key.padStart(12)} | ${(result.totalTime / 1000).toFixed(2).padStart(10)}s | ${result.averageTimePerProfile.toFixed(0).padStart(15)}ms | ${result.totalLLMCalls.toString().padStart(9)} | ${result.actualSpeedup.toFixed(2).padStart(7)}x`);
    }
    
  } catch (error) {
    console.error('Error running evaluation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { evaluateProfileWithAllRubricItems, runEvaluation, RateLimiter };

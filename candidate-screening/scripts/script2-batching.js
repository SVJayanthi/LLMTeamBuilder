#!/usr/bin/env node

/**
 * Script 2: Add Batching - Inject multiple profiles into each LLM prompt
 * This script optimizes by evaluating multiple profiles in a single LLM call
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

async function evaluateProfileBatch(profiles, rubric, batchSize = 3) {
  const rubricItemsText = rubric.items.map(item => `
${item.id.toUpperCase()}: ${item.description}
Scoring Guide:
1: ${item.scoreDescriptions[1]}
2: ${item.scoreDescriptions[2]}
3: ${item.scoreDescriptions[3]}
4: ${item.scoreDescriptions[4]}
5: ${item.scoreDescriptions[5]}
`).join('\n');

  const profilesText = profiles.map((profile, index) => `
PROFILE_${index + 1} (ID: ${profile.id}):
${JSON.stringify(profile, null, 2)}
`).join('\n');

  const expectedFormat = profiles.map((profile, index) => `
  "profile_${index + 1}": {
    "${rubric.items[0].id}": {
      "score": [1-5],
      "explanation": "detailed explanation"
    },
    "${rubric.items[1].id}": {
      "score": [1-5],
      "explanation": "detailed explanation"
    },
    "${rubric.items[2].id}": {
      "score": [1-5],
      "explanation": "detailed explanation"
    }
  }`).join(',');

  const prompt = `
Evaluate the following ${profiles.length} candidate profiles based on ALL rubric items below:

PROFILES:
${profilesText}

RUBRIC ITEMS:
${rubricItemsText}

Return a JSON object with scores for ALL profiles and ALL rubric items:
{${expectedFormat}
}

Only return valid JSON, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recruiter evaluating candidate profiles. Return only valid JSON responses with scores for all profiles and all rubric items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    
    // Normalize and validate results
    const normalizedResults = [];
    for (let i = 0; i < profiles.length; i++) {
      const profileKey = `profile_${i + 1}`;
      const profileResult = result[profileKey] || {};
      const normalizedProfile = {};
      
      for (const item of rubric.items) {
        if (profileResult[item.id]) {
          normalizedProfile[item.id] = {
            score: Math.max(1, Math.min(5, Math.round(profileResult[item.id].score))),
            explanation: profileResult[item.id].explanation || 'No explanation provided'
          };
        } else {
          normalizedProfile[item.id] = {
            score: 3,
            explanation: 'Unable to evaluate this item. Default score assigned.'
          };
        }
      }
      
      normalizedResults.push({
        profileId: profiles[i].id,
        profileName: profiles[i].name,
        evaluation: normalizedProfile
      });
    }
    
    return normalizedResults;
  } catch (error) {
    console.error('Error evaluating profile batch:', error);
    // Return default scores for all profiles and items
    return profiles.map(profile => {
      const defaultResult = {};
      for (const item of rubric.items) {
        defaultResult[item.id] = {
          score: 3,
          explanation: 'Unable to evaluate due to an error. Default score assigned.'
        };
      }
      return {
        profileId: profile.id,
        profileName: profile.name,
        evaluation: defaultResult
      };
    });
  }
}

async function runEvaluation(profileCount, batchSize = 3) {
  console.log(`\n=== Script 2: Batching - Testing with ${profileCount} profiles (batch size: ${batchSize}) ===`);
  
  // Load profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, profileCount);
  
  console.log(`Loaded ${profiles.length} profiles`);
  console.log(`Rubric has ${sampleRubric.items.length} items`);
  console.log(`Batch size: ${batchSize}`);
  
  const startTime = Date.now();
  const results = [];
  let totalLLMCalls = 0;
  
  // Process profiles in batches
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, Math.min(i + batchSize, profiles.length));
    console.log(`Evaluating batch ${Math.floor(i / batchSize) + 1}: profiles ${i + 1}-${i + batch.length}`);
    
    const batchStartTime = Date.now();
    const batchResults = await evaluateProfileBatch(batch, sampleRubric, batchSize);
    const batchEndTime = Date.now();
    totalLLMCalls++;
    
    // Process batch results
    for (const profileResult of batchResults) {
      const scores = Object.values(profileResult.evaluation).map(item => item.score);
      const totalScore = scores.reduce((sum, score) => sum + score, 0);
      const averageScore = totalScore / scores.length;
      
      const result = {
        profileId: profileResult.profileId,
        profileName: profileResult.profileName,
        rubricId: sampleRubric.id,
        evaluation: profileResult.evaluation,
        totalScore,
        averageScore,
        batchTime: batchEndTime - batchStartTime,
        batchSize: batch.length
      };
      
      results.push(result);
      console.log(`  - ${profileResult.profileName}: Score ${totalScore}/${sampleRubric.items.length * 5} (avg: ${averageScore.toFixed(2)})`);
    }
    
    console.log(`  - Batch time: ${batchEndTime - batchStartTime}ms`);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n--- Results Summary ---`);
  console.log(`Total profiles evaluated: ${results.length}`);
  console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`Average time per profile: ${(totalTime / results.length).toFixed(2)}ms`);
  console.log(`Total LLM calls: ${totalLLMCalls}`);
  console.log(`Average profiles per LLM call: ${(results.length / totalLLMCalls).toFixed(2)}`);
  console.log(`Efficiency gain vs individual calls: ${(results.length / totalLLMCalls).toFixed(2)}x`);
  
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
    totalLLMCalls,
    averageProfilesPerCall: results.length / totalLLMCalls,
    results: sortedResults
  };
}

async function main() {
  try {
    // Test with different profile counts and batch sizes
    const testConfigs = [
      { profiles: 5, batchSize: 3 },
      { profiles: 10, batchSize: 3 },
      { profiles: 10, batchSize: 5 },
      { profiles: 50, batchSize: 5 },
      { profiles: 50, batchSize: 10 }
    ];
    
    const allResults = {};
    
    for (const config of testConfigs) {
      const key = `${config.profiles}p_${config.batchSize}b`;
      allResults[key] = await runEvaluation(config.profiles, config.batchSize);
      
      // Add a small delay between tests
      if (config !== testConfigs[testConfigs.length - 1]) {
        console.log('\nWaiting 2 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary comparison
    console.log('\n=== PERFORMANCE COMPARISON ===');
    console.log('Config       | Total Time | Avg Time/Profile | LLM Calls | Profiles/Call');
    console.log('-------------|------------|------------------|-----------|---------------');
    for (const config of testConfigs) {
      const key = `${config.profiles}p_${config.batchSize}b`;
      const result = allResults[key];
      console.log(`${key.padStart(12)} | ${(result.totalTime / 1000).toFixed(2).padStart(10)}s | ${result.averageTimePerProfile.toFixed(0).padStart(15)}ms | ${result.totalLLMCalls.toString().padStart(9)} | ${result.averageProfilesPerCall.toFixed(1).padStart(13)}`);
    }
    
  } catch (error) {
    console.error('Error running evaluation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { evaluateProfileBatch, runEvaluation };

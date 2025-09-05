#!/usr/bin/env node

/**
 * Script 4: API Route Testing - Test optimizations on the actual Next.js API route
 * This script tests each optimization incrementally on the live API endpoint
 */

const fs = require('fs');
const path = require('path');

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

async function callEvaluateAPI(profile, rubric, baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile, rubric }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling API:', error.message);
    throw error;
  }
}

async function callBatchEvaluateAPI(profiles, rubric, baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/evaluate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profiles, rubric }),
    });

    if (!response.ok) {
      throw new Error(`Batch API call failed with status ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling batch API:', error.message);
    throw error;
  }
}

async function callConcurrentEvaluateAPI(profiles, rubric, maxConcurrent = 5, baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${baseUrl}/api/evaluate-concurrent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profiles, rubric, maxConcurrent }),
    });

    if (!response.ok) {
      throw new Error(`Concurrent API call failed with status ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling concurrent API:', error.message);
    throw error;
  }
}

async function testOptimization1PromptRedesign(profileCount = 5) {
  console.log(`\n=== Testing Optimization 1: Prompt Redesign via API ===`);
  console.log(`Testing with ${profileCount} profiles`);
  
  // Load profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, profileCount);
  
  console.log(`Loaded ${profiles.length} profiles`);
  console.log(`Rubric has ${sampleRubric.items.length} items`);
  
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    console.log(`Evaluating profile ${i + 1}/${profiles.length}: ${profile.name}`);
    
    const profileStartTime = Date.now();
    
    try {
      const evaluationResult = await callEvaluateAPI(profile, sampleRubric);
      const profileEndTime = Date.now();
      
      const result = {
        profileId: evaluationResult.profileId,
        profileName: profile.name,
        rubricId: evaluationResult.rubricId,
        totalScore: evaluationResult.totalScore,
        averageScore: evaluationResult.averageScore,
        evaluationTime: profileEndTime - profileStartTime,
        scores: evaluationResult.scores
      };
      
      results.push(result);
      console.log(`  - Total Score: ${evaluationResult.totalScore}/${sampleRubric.items.length * 5} (avg: ${evaluationResult.averageScore.toFixed(2)})`);
      console.log(`  - Time: ${result.evaluationTime}ms`);
    } catch (error) {
      console.error(`  - Failed to evaluate ${profile.name}: ${error.message}`);
      // Continue with next profile
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n--- Optimization 1 Results ---`);
  console.log(`Total profiles evaluated: ${results.length}`);
  console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`Average time per profile: ${results.length > 0 ? (totalTime / results.length).toFixed(2) : 0}ms`);
  console.log(`API calls made: ${results.length} (1 per profile)`);
  console.log(`Optimization: All rubric items evaluated in single prompt per profile`);
  
  // Show top 3 candidates
  if (results.length > 0) {
    const sortedResults = results.sort((a, b) => b.averageScore - a.averageScore);
    console.log(`\nTop 3 candidates:`);
    for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
      const result = sortedResults[i];
      console.log(`${i + 1}. ${result.profileName} - Score: ${result.averageScore.toFixed(2)}`);
    }
  }
  
  return {
    totalTime,
    averageTimePerProfile: results.length > 0 ? totalTime / results.length : 0,
    totalAPICalls: results.length,
    results: results.sort((a, b) => b.averageScore - a.averageScore),
    optimization: 'prompt-redesign'
  };
}

async function testOptimization2Batching(profileCount = 5, batchSize = 3) {
  console.log(`\n=== Testing Optimization 2: Batching via API ===`);
  console.log(`Testing with ${profileCount} profiles (batch size: ${batchSize})`);
  
  // Load profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, profileCount);
  
  console.log(`Loaded ${profiles.length} profiles`);
  console.log(`Rubric has ${sampleRubric.items.length} items`);
  console.log(`Batch size: ${batchSize}`);
  
  const startTime = Date.now();
  const results = [];
  let totalAPICalls = 0;
  
  // Process profiles in batches
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, Math.min(i + batchSize, profiles.length));
    console.log(`Evaluating batch ${Math.floor(i / batchSize) + 1}: profiles ${i + 1}-${i + batch.length}`);
    
    const batchStartTime = Date.now();
    
    try {
      const batchResponse = await callBatchEvaluateAPI(batch, sampleRubric);
      const batchEndTime = Date.now();
      totalAPICalls++;
      
      // Process batch results
      for (const evaluationResult of batchResponse.results) {
        const profile = batch.find(p => p.id === evaluationResult.profileId);
        const result = {
          profileId: evaluationResult.profileId,
          profileName: profile ? profile.name : 'Unknown',
          rubricId: evaluationResult.rubricId,
          totalScore: evaluationResult.totalScore,
          averageScore: evaluationResult.averageScore,
          batchTime: batchEndTime - batchStartTime,
          batchSize: batch.length,
          scores: evaluationResult.scores
        };
        
        results.push(result);
        console.log(`  - ${result.profileName}: Score ${evaluationResult.totalScore}/${sampleRubric.items.length * 5} (avg: ${evaluationResult.averageScore.toFixed(2)})`);
      }
      
      console.log(`  - Batch time: ${batchEndTime - batchStartTime}ms`);
    } catch (error) {
      console.error(`  - Failed to evaluate batch: ${error.message}`);
      // Continue with next batch
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`\n--- Optimization 2 Results ---`);
  console.log(`Total profiles evaluated: ${results.length}`);
  console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`Average time per profile: ${results.length > 0 ? (totalTime / results.length).toFixed(2) : 0}ms`);
  console.log(`API calls made: ${totalAPICalls}`);
  console.log(`Average profiles per API call: ${results.length > 0 ? (results.length / totalAPICalls).toFixed(2) : 0}`);
  console.log(`Efficiency gain vs individual calls: ${results.length > 0 ? (results.length / totalAPICalls).toFixed(2) : 0}x`);
  console.log(`Optimization: Multiple profiles evaluated in batches`);
  
  // Show top 3 candidates
  if (results.length > 0) {
    const sortedResults = results.sort((a, b) => b.averageScore - a.averageScore);
    console.log(`\nTop 3 candidates:`);
    for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
      const result = sortedResults[i];
      console.log(`${i + 1}. ${result.profileName} - Score: ${result.averageScore.toFixed(2)}`);
    }
  }
  
  return {
    totalTime,
    averageTimePerProfile: results.length > 0 ? totalTime / results.length : 0,
    totalAPICalls,
    averageProfilesPerCall: results.length > 0 ? results.length / totalAPICalls : 0,
    results: results.sort((a, b) => b.averageScore - a.averageScore),
    optimization: 'batching'
  };
}

async function testOptimization3Concurrency(profileCount = 5, maxConcurrent = 5) {
  console.log(`\n=== Testing Optimization 3: Concurrency via API ===`);
  console.log(`Testing with ${profileCount} profiles (max concurrent: ${maxConcurrent})`);
  
  // Load profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, profileCount);
  
  console.log(`Loaded ${profiles.length} profiles`);
  console.log(`Rubric has ${sampleRubric.items.length} items`);
  console.log(`Max concurrent: ${maxConcurrent}`);
  
  const startTime = Date.now();
  
  try {
    const concurrentResponse = await callConcurrentEvaluateAPI(profiles, sampleRubric, maxConcurrent);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Process results
    const results = concurrentResponse.results.map((evaluationResult) => {
      const profile = profiles.find(p => p.id === evaluationResult.profileId);
      return {
        profileId: evaluationResult.profileId,
        profileName: profile ? profile.name : 'Unknown',
        rubricId: evaluationResult.rubricId,
        totalScore: evaluationResult.totalScore,
        averageScore: evaluationResult.averageScore,
        scores: evaluationResult.scores
      };
    });
    
    console.log(`All ${results.length} profiles evaluated concurrently`);
    
    console.log(`\n--- Optimization 3 Results ---`);
    console.log(`Total profiles evaluated: ${results.length}`);
    console.log(`Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`Average time per profile: ${results.length > 0 ? (totalTime / results.length).toFixed(2) : 0}ms`);
    console.log(`API calls made: 1 (concurrent evaluation)`);
    console.log(`Max concurrent requests: ${maxConcurrent}`);
    console.log(`Actual speedup achieved: ${concurrentResponse.actualSpeedup ? concurrentResponse.actualSpeedup.toFixed(2) : 'N/A'}x`);
    console.log(`Optimization: Multiple profiles evaluated concurrently with rate limiting`);
    
    // Show top 3 candidates
    if (results.length > 0) {
      const sortedResults = results.sort((a, b) => b.averageScore - a.averageScore);
      console.log(`\nTop 3 candidates:`);
      for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
        const result = sortedResults[i];
        console.log(`${i + 1}. ${result.profileName} - Score: ${result.averageScore.toFixed(2)}`);
      }
    }
    
    return {
      totalTime,
      averageTimePerProfile: results.length > 0 ? totalTime / results.length : 0,
      totalAPICalls: 1,
      maxConcurrent,
      actualSpeedup: concurrentResponse.actualSpeedup,
      results: results.sort((a, b) => b.averageScore - a.averageScore),
      optimization: 'concurrency'
    };
  } catch (error) {
    console.error(`Failed to evaluate profiles concurrently: ${error.message}`);
    return {
      totalTime: 0,
      averageTimePerProfile: 0,
      totalAPICalls: 0,
      maxConcurrent,
      actualSpeedup: 0,
      results: [],
      optimization: 'concurrency'
    };
  }
}

async function checkServerHealth(baseUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(baseUrl, { method: 'GET' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('=== Script 4: API Route Testing ===');
  console.log('Testing optimizations on the actual Next.js API endpoint\n');
  
  // Check if server is running
  console.log('Checking if development server is running...');
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    console.error('❌ Development server is not running!');
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running');
  
  try {
    // Test Optimization 1: Prompt Redesign
    console.log('\n🔍 Testing Optimization 1: Prompt Redesign');
    const opt1Results = {};
    const testCounts = [3, 5];
    
    for (const count of testCounts) {
      const key = `opt1_${count}profiles`;
      opt1Results[key] = await testOptimization1PromptRedesign(count);
      
      // Add delay between tests
      console.log('\nWaiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test Optimization 2: Batching
    console.log('\n🔍 Testing Optimization 2: Batching');
    const opt2Results = {};
    const batchConfigs = [
      { profiles: 5, batchSize: 3 },
      { profiles: 5, batchSize: 5 }
    ];
    
    for (const config of batchConfigs) {
      const key = `opt2_${config.profiles}p_${config.batchSize}b`;
      opt2Results[key] = await testOptimization2Batching(config.profiles, config.batchSize);
      
      // Add delay between tests
      console.log('\nWaiting 2 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test Optimization 3: Concurrency
    console.log('\n🔍 Testing Optimization 3: Concurrency');
    const opt3Results = {};
    const concurrentConfigs = [
      { profiles: 5, maxConcurrent: 3 },
      { profiles: 5, maxConcurrent: 5 }
    ];
    
    for (const config of concurrentConfigs) {
      const key = `opt3_${config.profiles}p_${config.maxConcurrent}c`;
      opt3Results[key] = await testOptimization3Concurrency(config.profiles, config.maxConcurrent);
      
      // Add delay between tests
      if (config !== concurrentConfigs[concurrentConfigs.length - 1]) {
        console.log('\nWaiting 3 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Combined results
    const allResults = { ...opt1Results, ...opt2Results, ...opt3Results };
    
    // Summary comparison
    console.log('\n=== API PERFORMANCE SUMMARY ===');
    console.log('Test            | Total Time | Avg Time/Profile | API Calls | Efficiency | Optimization');
    console.log('----------------|------------|------------------|-----------|------------|-------------');
    
    // Show Optimization 1 results
    for (const count of testCounts) {
      const key = `opt1_${count}profiles`;
      const result = allResults[key];
      console.log(`${key.padEnd(15)} | ${(result.totalTime / 1000).toFixed(2).padStart(10)}s | ${result.averageTimePerProfile.toFixed(0).padStart(15)}ms | ${result.totalAPICalls.toString().padStart(9)} | ${result.totalAPICalls.toString().padStart(10)} | ${result.optimization}`);
    }
    
    // Show Optimization 2 results
    for (const config of batchConfigs) {
      const key = `opt2_${config.profiles}p_${config.batchSize}b`;
      const result = allResults[key];
      const efficiency = result.averageProfilesPerCall ? `${result.averageProfilesPerCall.toFixed(1)}x` : '1x';
      console.log(`${key.padEnd(15)} | ${(result.totalTime / 1000).toFixed(2).padStart(10)}s | ${result.averageTimePerProfile.toFixed(0).padStart(15)}ms | ${result.totalAPICalls.toString().padStart(9)} | ${efficiency.padStart(10)} | ${result.optimization}`);
    }
    
    // Show Optimization 3 results
    for (const config of concurrentConfigs) {
      const key = `opt3_${config.profiles}p_${config.maxConcurrent}c`;
      const result = allResults[key];
      const speedup = result.actualSpeedup ? `${result.actualSpeedup.toFixed(1)}x` : 'N/A';
      console.log(`${key.padEnd(15)} | ${(result.totalTime / 1000).toFixed(2).padStart(10)}s | ${result.averageTimePerProfile.toFixed(0).padStart(15)}ms | ${result.totalAPICalls.toString().padStart(9)} | ${speedup.padStart(10)} | ${result.optimization}`);
    }
    
    console.log('\n✅ All 3 optimizations testing completed successfully!');
    
  } catch (error) {
    console.error('Error running API tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  testOptimization1PromptRedesign, 
  testOptimization2Batching,
  testOptimization3Concurrency,
  callEvaluateAPI, 
  callBatchEvaluateAPI,
  callConcurrentEvaluateAPI 
};
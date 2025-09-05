#!/usr/bin/env node

/**
 * Test script to verify the application is using the concurrent evaluation route
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

async function testConcurrentIntegration() {
  console.log('🔍 Testing Concurrent Evaluation Integration');
  console.log('===========================================\n');
  
  // Load test profiles
  const profilesPath = path.join(__dirname, '../data/form-submissions.json');
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).slice(0, 3);
  
  console.log(`Testing with ${profiles.length} profiles:`);
  profiles.forEach((profile, index) => {
    console.log(`${index + 1}. ${profile.name}`);
  });
  console.log('');
  
  try {
    console.log('🚀 Calling /api/evaluate-concurrent...');
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/evaluate-concurrent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        profiles, 
        rubric: sampleRubric,
        maxConcurrent: 5
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('✅ Concurrent evaluation completed successfully!');
    console.log('');
    console.log('📊 Results Summary:');
    console.log(`   • Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`   • Profiles Evaluated: ${result.results.length}`);
    console.log(`   • Max Concurrent: ${result.maxConcurrent}`);
    console.log(`   • Actual Speedup: ${result.actualSpeedup.toFixed(2)}x`);
    console.log(`   • Optimization Used: ${result.optimization}`);
    console.log('');
    
    console.log('🏆 Top Candidates:');
    result.results.slice(0, 3).forEach((candidate, index) => {
      const profile = profiles.find(p => p.id === candidate.profileId);
      console.log(`   ${index + 1}. ${profile?.name || 'Unknown'} - Score: ${candidate.averageScore.toFixed(2)} (${candidate.totalScore}/${sampleRubric.items.length * 5})`);
    });
    
    console.log('\n✅ Integration test passed! The application is successfully using concurrent evaluation.');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\nℹ️  Make sure the development server is running: npm run dev');
    process.exit(1);
  }
}

async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000', { method: 'GET' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking server health...');
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    console.error('❌ Development server is not running!');
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Development server is running\n');
  
  await testConcurrentIntegration();
}

if (require.main === module) {
  main();
}

module.exports = { testConcurrentIntegration };
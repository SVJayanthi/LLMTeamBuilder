import OpenAI from 'openai';
import { Profile, RubricItem, Rubric } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EvaluationScore {
  score: number;
  explanation: string;
}

export interface AllItemsEvaluationResult {
  [itemId: string]: EvaluationScore;
}

export interface BatchEvaluationResult {
  profileId: string;
  profileName: string;
  evaluation: AllItemsEvaluationResult;
}

export async function evaluateProfileWithRubricItem(
  profile: Profile,
  rubricItem: RubricItem
): Promise<EvaluationScore> {
  const prompt = `
Evaluate the following candidate profile based on the rubric item:

Profile:
${JSON.stringify(profile, null, 2)}

Rubric Item: ${rubricItem.description}

Scoring Guide:
1: ${rubricItem.scoreDescriptions[1]}
2: ${rubricItem.scoreDescriptions[2]}
3: ${rubricItem.scoreDescriptions[3]}
4: ${rubricItem.scoreDescriptions[4]}
5: ${rubricItem.scoreDescriptions[5]}

Return a JSON object with:
{
  "score": [1-5],
  "explanation": "detailed explanation for the score"
}

Only return valid JSON, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recruiter evaluating candidate profiles. Return only valid JSON responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content) as EvaluationScore;
    
    // Validate score is between 1-5
    if (result.score < 1 || result.score > 5) {
      result.score = Math.max(1, Math.min(5, Math.round(result.score)));
    }
    
    return result;
  } catch (error) {
    console.error('Error evaluating profile:', error);
    // Return a default score in case of error
    return {
      score: 3,
      explanation: 'Unable to evaluate due to an error. Default score assigned.'
    };
  }
}

// OPTIMIZATION 1: Prompt Redesign - Evaluate all rubric items in one prompt
export async function evaluateProfileWithAllRubricItems(
  profile: Profile,
  rubric: Rubric
): Promise<AllItemsEvaluationResult> {
  const rubricItemsText = rubric.items.map(item => `
${item.id.toUpperCase()}: ${item.description}
Scoring Guide:
1: ${item.scoreDescriptions[1]}
2: ${item.scoreDescriptions[2]}
3: ${item.scoreDescriptions[3]}
4: ${item.scoreDescriptions[4]}
5: ${item.scoreDescriptions[5]}
`).join('\n');

  const expectedFormat = rubric.items.map(item => `
  "${item.id}": {
    "score": [1-5],
    "explanation": "detailed explanation for the score"
  }`).join(',');

  const prompt = `
Evaluate the following candidate profile based on ALL rubric items below:

Profile:
${JSON.stringify(profile, null, 2)}

RUBRIC ITEMS:
${rubricItemsText}

Return a JSON object with scores for ALL rubric items:
{${expectedFormat}
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

    let content = response.choices[0]?.message?.content || '{}';
    
    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    const result = JSON.parse(content);
    
    // Validate and normalize scores
    const normalizedResult: AllItemsEvaluationResult = {};
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
    const defaultResult: AllItemsEvaluationResult = {};
    for (const item of rubric.items) {
      defaultResult[item.id] = {
        score: 3,
        explanation: 'Unable to evaluate due to an error. Default score assigned.'
      };
    }
    return defaultResult;
  }
}

// OPTIMIZATION 2: Batching - Evaluate multiple profiles in single LLM call
export async function evaluateProfileBatch(
  profiles: Profile[],
  rubric: Rubric
): Promise<BatchEvaluationResult[]> {
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
PROFILE_${index + 1} (ID: ${profile.id}, Name: ${profile.name}):
${JSON.stringify(profile, null, 2)}
`).join('\n');

  const expectedFormat = profiles.map((profile, index) => `
  "profile_${index + 1}": {
    ${rubric.items.map(item => `"${item.id}": {
      "score": [1-5],
      "explanation": "detailed explanation"
    }`).join(',\n    ')}
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
      model: 'gpt-4o-mini',
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
    });

    let content = response.choices[0]?.message?.content || '{}';
    
    // Strip markdown code blocks if present
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    const result = JSON.parse(content);
    
    // Normalize and validate results
    const normalizedResults: BatchEvaluationResult[] = [];
    for (let i = 0; i < profiles.length; i++) {
      const profileKey = `profile_${i + 1}`;
      const profileResult = result[profileKey] || {};
      const normalizedProfile: AllItemsEvaluationResult = {};
      
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
        profileName: profiles[i].name || 'Unknown',
        evaluation: normalizedProfile
      });
    }
    
    return normalizedResults;
  } catch (error) {
    console.error('Error evaluating profile batch:', error);
    // Return default scores for all profiles and items
    return profiles.map(profile => {
      const defaultResult: AllItemsEvaluationResult = {};
      for (const item of rubric.items) {
        defaultResult[item.id] = {
          score: 3,
          explanation: 'Unable to evaluate due to an error. Default score assigned.'
        };
      }
      return {
        profileId: profile.id,
        profileName: profile.name || 'Unknown',
        evaluation: defaultResult
      };
    });
  }
}
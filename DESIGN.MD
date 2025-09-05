# Application Design Specification

## Project Overview
A Next.js & React application for screening job applications using AI-powered rubric-based evaluation. The application allows users to create custom evaluation rubrics and batch process candidate profiles through OpenAI's completion API.

## Technical Stack
- **Frontend Framework**: Next.js 14+ with React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API or Zustand
- **API Integration**: OpenAI Completion API
- **Data Storage**: JSON file (form-submissions.json)
- **UI Components**: shadcn/ui or Radix UI

## Environment Configuration
```env
OPENAI_API_KEY=your_api_key_here
```

## Application Architecture

### Data Model

#### Profile Schema
```typescript
interface Profile {
  name: string;
  email: string;
  phone: string;
  location: string;
  submitted_at: string;
  work_availability: string[];
  annual_salary_expectation: {
    "full-time"?: string;
    "part-time"?: string;
  };
  work_experiences: WorkExperience[];
  education: Education;
  skills: string[];
}

interface WorkExperience {
  company: string;
  roleName: string;
}

interface Education {
  highest_level: string;
  degrees: Degree[];
}

interface Degree {
  degree: string;
  subject: string;
  school: string;
  gpa: string;
  startDate: string;
  endDate: string;
  originalSchool: string;
  isTop50: boolean;
}
```

#### Rubric Schema
```typescript
interface Rubric {
  id: string;
  title: string;
  items: RubricItem[];
  createdAt: Date;
}

interface RubricItem {
  id: string;
  description: string;
  scoreDescriptions: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
}

interface EvaluationResult {
  profileId: string;
  rubricId: string;
  scores: {
    itemId: string;
    score: number;
    explanation: string;
  }[];
  totalScore: number;
  averageScore: number;
  evaluatedAt: Date;
}
```

## Component Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── evaluate/
│           └── route.ts
├── components/
│   ├── layout/
│   │   ├── LeftPanel.tsx
│   │   └── RightPanel.tsx
│   ├── rubric/
│   │   ├── RubricModal.tsx
│   │   ├── RubricList.tsx
│   │   ├── RubricCard.tsx
│   │   └── RubricItemForm.tsx
│   ├── evaluation/
│   │   ├── EvaluationRunner.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── ResultsCarousel.tsx
│   └── profile/
│       ├── ProfileCard.tsx
│       └── ProfileDetails.tsx
├── lib/
│   ├── openai.ts
│   ├── data-loader.ts
│   └── evaluation-engine.ts
├── hooks/
│   ├── useRubrics.ts
│   ├── useProfiles.ts
│   └── useEvaluation.ts
└── types/
    └── index.ts
```

## UI/UX Design

### Layout Structure
- **Split Screen Design**: 50/50 vertical split
- **Left Panel**: Rubric management interface
- **Right Panel**: Evaluation runner and results display

### Left Panel Features
1. **Create Rubric Button**: Opens modal for new rubric creation
2. **Rubric Modal**:
   - Title input field
   - Dynamic rubric item addition
   - For each item:
     - Description textarea
     - Score definitions (1-5) with text inputs
   - Save/Cancel actions
3. **Rubric Display**:
   - Card-based layout for each rubric
   - Delete button on each card
   - Expandable view to show rubric items

### Right Panel Features
1. **Run Evaluation Button**: Primary CTA button
2. **Progress Display**:
   - Overall progress bar
   - Individual rubric progress indicators
   - Real-time status updates
3. **Results Section**:
   - Horizontal carousel for top profiles
   - Profile cards with:
     - Basic info (name, location)
     - Overall score
     - Score breakdown by rubric
   - Detailed view on click

## State Management

### Global State
```typescript
interface AppState {
  profiles: Profile[];
  rubrics: Rubric[];
  evaluations: Map<string, EvaluationResult[]>;
  isEvaluating: boolean;
  evaluationProgress: {
    currentRubric: string;
    currentProfile: number;
    totalProfiles: number;
    completedRubrics: string[];
  };
}
```

### State Actions
- `addRubric(rubric: Rubric)`
- `deleteRubric(rubricId: string)`
- `updateRubric(rubricId: string, updates: Partial<Rubric>)`
- `startEvaluation()`
- `updateProgress(progress: Partial<EvaluationProgress>)`
- `setEvaluationResults(rubricId: string, results: EvaluationResult[])`

## API Integration

### OpenAI Integration Strategy
```typescript
// Prompt Template
const evaluationPrompt = `
Evaluate the following candidate profile based on the rubric item:

Profile:
${JSON.stringify(profile)}

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
`;
```

### Batch Processing Logic
1. Load first 5 profiles from data/form-submissions.json
2. For each rubric (serial processing):
   - For each profile:
     - For each rubric item:
       - Call OpenAI API
       - Parse response
       - Store results
   - Update progress after each profile
3. Calculate rankings based on average scores
4. Display top profiles in carousel

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Load profiles on demand
2. **Debouncing**: Debounce rubric form inputs
3. **Caching**: Cache OpenAI responses for identical evaluations
4. **Progress Streaming**: Use Server-Sent Events for real-time progress
5. **Rate Limiting**: Implement OpenAI API rate limiting logic

### Error Handling
- Retry logic for failed API calls
- Graceful degradation for partial failures
- User-friendly error messages
- Automatic save of partial results

## API Routes

### `/api/evaluate` (POST)
```typescript
interface EvaluateRequest {
  profileIds: string[];
  rubricIds: string[];
}

interface EvaluateResponse {
  status: 'success' | 'partial' | 'error';
  results: EvaluationResult[];
  errors?: string[];
}
```

### `/api/profiles` (GET)
- Returns first 5 profiles from JSON file
- Supports pagination for future expansion

### `/api/rubrics` (GET, POST, DELETE)
- CRUD operations for rubrics
- Stored in local state (or localStorage for persistence)

## Development Phases
🔧 Implemented Optimizations

  1. Optimization 1: Prompt Redesign

  - Location: /app/api/evaluate/route.ts + /lib/openai.ts
  - Function: evaluateProfileWithAllRubricItems()
  - Improvement: Evaluates all rubric items in one LLM call instead of separate calls per item
  - Performance: ~5.2-7.6 seconds per profile (vs original multiple calls per item)

  2. Optimization 2: Batching

  - Location: /app/api/evaluate-batch/route.ts + /lib/openai.ts
  - Function: evaluateProfileBatch()
  - Improvement: Evaluates multiple profiles in a single LLM call
  - Performance: Significant API call reduction (2.5x - 5.0x efficiency gain)

  3. Optimization 3: Concurrency

  - Location: /app/api/evaluate-concurrent/route.ts
  - Class: RateLimiter for controlled concurrency
  - Improvement: Parallel evaluation with rate limiting to respect API limits
  - Performance: Best overall performance (1.6-1.9 seconds per profile, 2.4x - 3.7x speedup)

  📊 Performance Comparison Results

  | Test Configuration | Total Time | Avg Time/Profile | API Calls | Efficiency | Optimization    |
  |--------------------|------------|------------------|-----------|------------|-----------------|
  | opt1_3profiles     | 22.67s     | 7,556ms          | 3         | 3 calls    | prompt-redesign |
  | opt1_5profiles     | 26.08s     | 5,216ms          | 5         | 5 calls    | prompt-redesign |
  | opt2_5p_3b         | 27.38s     | 5,476ms          | 2         | 2.5x       | batching        |
  | opt2_5p_5b         | 29.48s     | 5,897ms          | 1         | 5.0x       | batching        |
  | opt3_5p_3c         | 9.44s      | 1,889ms          | 1         | 2.4x       | concurrency     |
  | opt3_5p_5c         | 7.88s      | 1,576ms          | 1         | 3.7x       | concurrency     |

  🏆 Key Findings

  1. Best Performance: Concurrency (Optimization 3) provides the fastest evaluation times
  2. Most Cost-Efficient: Batching (Optimization 2) minimizes API calls for cost savings
  3. Most Versatile: Prompt Redesign (Optimization 1) works well for single profile evaluations
  4. Scalable: All optimizations handle the test data successfully with proper error handling
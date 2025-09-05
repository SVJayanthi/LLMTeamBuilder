export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  submitted_at: string;
  work_availability: string[];
  annual_salary_expectation: {
    "full-time"?: string;
    "part-time"?: string;
    "contract"?: string;
  };
  work_experiences: WorkExperience[];
  education: Education;
  skills: string[];
}

export interface WorkExperience {
  company: string;
  roleName: string;
}

export interface Education {
  highest_level: string;
  degrees: Degree[];
}

export interface Degree {
  degree: string;
  subject: string;
  school: string;
  gpa: string;
  startDate: string;
  endDate: string;
  originalSchool: string;
  isTop50: boolean;
}

export interface Rubric {
  id: string;
  title: string;
  items: RubricItem[];
  createdAt: Date;
}

export interface RubricItem {
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

export interface EvaluationResult {
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

export interface EvaluationProgress {
  currentRubric: string;
  currentProfile: number;
  totalProfiles: number;
  completedRubrics: string[];
  currentRubricIndex: number;
  totalRubrics: number;
}

export interface AppState {
  profiles: Profile[];
  rubrics: Rubric[];
  evaluations: Map<string, EvaluationResult[]>;
  isEvaluating: boolean;
  evaluationProgress: EvaluationProgress | null;
}
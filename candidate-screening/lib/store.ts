import { create } from 'zustand';
import { Profile, Rubric, EvaluationResult, EvaluationProgress } from '@/types';

interface AppStore {
  profiles: Profile[];
  rubrics: Rubric[];
  evaluations: Map<string, EvaluationResult[]>;
  isEvaluating: boolean;
  evaluationProgress: EvaluationProgress | null;
  
  setProfiles: (profiles: Profile[]) => void;
  addRubric: (rubric: Rubric) => void;
  deleteRubric: (rubricId: string) => void;
  updateRubric: (rubricId: string, updates: Partial<Rubric>) => void;
  startEvaluation: () => void;
  stopEvaluation: () => void;
  updateProgress: (progress: Partial<EvaluationProgress>) => void;
  setEvaluationResults: (rubricId: string, results: EvaluationResult[]) => void;
  clearEvaluations: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  profiles: [],
  rubrics: [],
  evaluations: new Map(),
  isEvaluating: false,
  evaluationProgress: null,
  
  setProfiles: (profiles) => set({ profiles }),
  
  addRubric: (rubric) => set((state) => ({
    rubrics: [...state.rubrics, rubric]
  })),
  
  deleteRubric: (rubricId) => set((state) => ({
    rubrics: state.rubrics.filter(r => r.id !== rubricId),
    evaluations: (() => {
      const newEvaluations = new Map(state.evaluations);
      newEvaluations.delete(rubricId);
      return newEvaluations;
    })()
  })),
  
  updateRubric: (rubricId, updates) => set((state) => ({
    rubrics: state.rubrics.map(r => 
      r.id === rubricId ? { ...r, ...updates } : r
    )
  })),
  
  startEvaluation: () => set({ 
    isEvaluating: true,
    evaluationProgress: null
  }),
  
  stopEvaluation: () => set({ 
    isEvaluating: false,
    evaluationProgress: null 
  }),
  
  updateProgress: (progress) => set((state) => ({
    evaluationProgress: state.evaluationProgress 
      ? { ...state.evaluationProgress, ...progress }
      : progress as EvaluationProgress
  })),
  
  setEvaluationResults: (rubricId, results) => set((state) => {
    const newEvaluations = new Map(state.evaluations);
    newEvaluations.set(rubricId, results);
    return { evaluations: newEvaluations };
  }),
  
  clearEvaluations: () => set({ evaluations: new Map() })
}));
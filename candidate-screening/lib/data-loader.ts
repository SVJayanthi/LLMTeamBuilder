import { Profile } from '@/types';
import formSubmissions from '@/data/form-submissions.json';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function loadProfiles(limit: number = 50): Profile[] {
  // Get all profiles and shuffle them
  const allProfiles = formSubmissions as any[];
  const shuffledProfiles = shuffleArray(allProfiles);
  
  // Take the requested number and assign numerical IDs
  return shuffledProfiles.slice(0, Math.min(limit, allProfiles.length)).map((profile, index) => ({
    ...profile,
    id: (index + 1).toString()
  })) as Profile[];
}
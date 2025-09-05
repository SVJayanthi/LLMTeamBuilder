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

export function loadProfiles(limit: number = 1000): Profile[] {
  // Get the first X profiles in a deterministic order (no shuffling)
  const allProfiles = formSubmissions as any[];
  const selectedProfiles = allProfiles.slice(0, Math.min(limit, allProfiles.length));

  // Assign stable IDs based on profile content to avoid ID mismatches across requests
  return selectedProfiles.map((profile) => {
    const stableId = `${profile.name.replace(/\s+/g, '-').toLowerCase()}-${profile.email.split('@')[0]}`;
    return {
      ...profile,
      id: stableId,
    };
  }) as Profile[];
}
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function useProfiles() {
  const setProfiles = useAppStore((state) => state.setProfiles);
  const profiles = useAppStore((state) => state.profiles);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch('/api/profiles');
        if (response.ok) {
          const data = await response.json();
          setProfiles(data);
        }
      } catch (error) {
        console.error('Error loading profiles:', error);
      }
    };

    if (profiles.length === 0) {
      loadProfiles();
    }
  }, [profiles.length, setProfiles]);

  return profiles;
}
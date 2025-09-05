'use client';

import React, { useEffect } from 'react';
import LeftPanel from '@/components/layout/LeftPanel';
import RightPanel from '@/components/layout/RightPanel';
import CandidateDetailsPanel from '@/components/layout/CandidateDetailsPanel';
import { useProfiles } from '@/hooks/useProfiles';
import { useAppStore } from '@/lib/store';

export default function Home() {
  useProfiles(); // Load profiles on mount

  const rubrics = useAppStore((s) => s.rubrics);
  const addRubric = useAppStore((s) => s.addRubric);

  // Seed a default Engineer Rubric on initial load (if not present)
  useEffect(() => {
    const id = 'engineer-rubric';
    if (rubrics.some((r) => r.id === id)) return;

    addRubric({
      id,
      title: 'Engineer Rubric',
      createdAt: new Date(),
      items: [
        {
          id: 'years_of_experience',
          description: 'Years of Experience',
          scoreDescriptions: {
            1: '< 1 year',
            2: '1-2 years',
            3: '2-3 years',
            4: '3-5 years',
            5: '>5 years',
          },
        },
        {
          id: 'framework_knowledge',
          description: 'Framework Knowledge',
          scoreDescriptions: {
            1: 'Few basics',
            2: 'One Stack Familiarity',
            3: 'Multiple stack, decent fluency',
            4: 'Full-stack manager',
            5: 'Deep expertise across multiple domains',
          },
        },
        {
          id: 'system_design',
          description: 'System Design',
          scoreDescriptions: {
            1: 'None',
            2: 'Small scripts projects',
            3: 'Some web apps',
            4: 'Design mid-scale apps',
            5: 'Large-scale distributed',
          },
        },
      ],
    });
  }, [rubrics, addRubric]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100">
      <LeftPanel />
      <RightPanel />
      <CandidateDetailsPanel />
    </div>
  );
}
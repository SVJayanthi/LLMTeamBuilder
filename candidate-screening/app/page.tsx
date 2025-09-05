'use client';

import React from 'react';
import LeftPanel from '@/components/layout/LeftPanel';
import RightPanel from '@/components/layout/RightPanel';
import CandidateDetailsPanel from '@/components/layout/CandidateDetailsPanel';
import { useProfiles } from '@/hooks/useProfiles';

export default function Home() {
  useProfiles(); // Load profiles on mount

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100">
      <LeftPanel />
      <RightPanel />
      <CandidateDetailsPanel />
    </div>
  );
}
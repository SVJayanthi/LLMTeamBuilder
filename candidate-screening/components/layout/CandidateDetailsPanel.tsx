'use client';

import React from 'react';

export default function CandidateDetailsPanel() {
  return (
    <div className="w-1/3 h-full bg-white/90 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-800">Candidate Details</h2>
        <div className="text-center text-gray-500 mt-12">
          <p>Select a candidate to view details</p>
        </div>
      </div>
    </div>
  );
}

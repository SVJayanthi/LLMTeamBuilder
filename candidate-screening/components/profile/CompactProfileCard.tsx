'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Profile, EvaluationResult, Rubric } from '@/types';
import { MapPin, Mail, Briefcase, GraduationCap } from 'lucide-react';
import ProfileDetails from './ProfileDetails';

interface CompactProfileCardProps {
  profile: Profile;
  result: EvaluationResult;
  rubric: Rubric;
}

export default function CompactProfileCard({ profile, result, rubric }: CompactProfileCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white via-purple-50/30 to-indigo-50/30 border-purple-200 hover:border-purple-300 hover:shadow-purple-100"
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{profile.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-600">
                    {result.averageScore.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">/5</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profile.email.split('@')[0]}...
                  </div>
                </div>
                <div className="w-16 bg-purple-100 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full"
                    style={{ width: `${(result.averageScore / 5) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{profile.work_experiences[0]?.roleName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  <span>{profile.education.highest_level}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showDetails && (
        <ProfileDetails
          profile={profile}
          result={result}
          rubric={rubric}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
}
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, EvaluationResult, Rubric } from '@/types';
import { MapPin, Mail, Briefcase, GraduationCap } from 'lucide-react';
import ProfileDetails from './ProfileDetails';

interface ProfileCardProps {
  profile: Profile;
  result: EvaluationResult;
  rubric: Rubric;
}

export default function ProfileCard({ profile, result, rubric }: ProfileCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white via-purple-50/50 to-indigo-50/50 border-purple-200 hover:border-purple-300 hover:shadow-purple-100"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader>
          <CardTitle className="text-lg">{profile.name}</CardTitle>
          <div className="text-sm text-gray-500 space-y-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {profile.email}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Average Score</span>
              <span className="text-2xl font-bold text-purple-600">
                {result.averageScore.toFixed(1)}/5
              </span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full"
                style={{ width: `${(result.averageScore / 5) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <span>{profile.work_experiences[0]?.roleName} at {profile.work_experiences[0]?.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gray-400" />
              <span>{profile.education.highest_level}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">
              Total Score: {result.totalScore} | {rubric.items.length} criteria evaluated
            </p>
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
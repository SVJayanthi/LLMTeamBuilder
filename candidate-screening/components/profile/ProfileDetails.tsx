'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Profile, EvaluationResult, Rubric } from '@/types';
import { MapPin, Mail, Phone, Star } from 'lucide-react';

interface ProfileDetailsProps {
  profile: Profile;
  result: EvaluationResult;
  rubric: Rubric;
  onClose: () => void;
}

export default function ProfileDetails({ profile, result, rubric, onClose }: ProfileDetailsProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-none max-h-[90vh] overflow-y-auto fixed left-[66.666vw] top-[55%] translate-x-0 translate-y-[-50%] w-[calc(33.333vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{profile.name}</DialogTitle>
          <DialogDescription>
            Detailed evaluation results for {rubric.title}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50/70 to-white/80 p-4 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold mb-3 text-purple-900">Contact Information</h3>
              <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {profile.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {profile.phone}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {profile.location}
              </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50/50 to-white/70 p-4 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold mb-3 text-purple-900">Work Experience</h3>
              <div className="space-y-3">
                {profile.work_experiences.map((exp, index) => (
                  <div key={index} className="text-sm bg-white/80 p-3 rounded-md border border-purple-100/50">
                    <div className="font-medium text-gray-900">{exp.roleName}</div>
                    <div className="text-gray-600">{exp.company}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50/40 to-white/60 p-4 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold mb-3 text-purple-900">Education</h3>
              <div className="space-y-3">
                {profile.education.degrees.map((degree, index) => (
                  <div key={index} className="text-sm bg-white/80 p-3 rounded-md border border-purple-100/50">
                    <div className="font-medium text-gray-900">{degree.degree} in {degree.subject}</div>
                    <div className="text-gray-600">{degree.school}</div>
                    <div className="text-gray-500 text-xs">{degree.startDate} - {degree.endDate}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50/30 to-white/50 p-4 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold mb-3 text-purple-900">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200/50">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50/80 to-white/90 p-4 rounded-lg border border-purple-200/50">
              <h3 className="font-semibold mb-4 text-purple-900">Evaluation Scores</h3>
              <div className="bg-gradient-to-br from-purple-100/80 to-indigo-100/80 p-4 rounded-lg border border-purple-300/50 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-purple-900">Overall Score</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {result.averageScore.toFixed(1)}/5
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {rubric.items.map((item) => {
                const score = result.scores.find(s => s.itemId === item.id);
                if (!score) return null;
                
                return (
                  <div key={item.id} className="bg-white/90 border border-purple-200 rounded-lg p-4 shadow-sm">
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm text-gray-900 flex-1">{item.description}</p>
                        <span className="ml-2 font-semibold text-purple-700">{score.score}/5</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= score.score
                                ? 'fill-purple-400 text-purple-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50/50 to-white/70 p-3 rounded-md border border-purple-100/50">
                      <p className="text-sm text-gray-700">
                        {score.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import RubricList from '@/components/rubric/RubricList';
import RubricModal from '@/components/rubric/RubricModal';

export default function LeftPanel() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="w-1/3 h-full border-r-2 border-purple-300 bg-white/90 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-purple-800">Evaluation Rubrics</h2>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 rounded-lg shadow-md">
          <Button onClick={() => setModalOpen(true)} className="w-full bg-white text-purple-800 hover:bg-purple-50 border-0">
            <Plus className="mr-2 h-4 w-4" />
            Create New Rubric
          </Button>
        </div>
      </div>
      
      <RubricList />
      
      <RubricModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
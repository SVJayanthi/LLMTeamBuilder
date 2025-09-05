'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { Rubric, RubricItem } from '@/types';
import RubricItemForm from './RubricItemForm';
import { Plus, Trash2 } from 'lucide-react';

interface RubricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RubricModal({ open, onOpenChange }: RubricModalProps) {
  const addRubric = useAppStore((state) => state.addRubric);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<RubricItem[]>([]);

  const handleAddItem = () => {
    const newItem: RubricItem = {
      id: `item-${Date.now()}`,
      description: '',
      scoreDescriptions: {
        1: '',
        2: '',
        3: '',
        4: '',
        5: '',
      },
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updatedItem: RubricItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a rubric title');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one rubric item');
      return;
    }
    
    const validItems = items.filter(item => item.description.trim());
    if (validItems.length === 0) {
      alert('Please fill in at least one rubric item description');
      return;
    }
    
    const newRubric: Rubric = {
      id: `rubric-${Date.now()}`,
      title,
      items: validItems,
      createdAt: new Date(),
    };
    
    addRubric(newRubric);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto fixed left-4 top-[50%] translate-x-0 translate-y-[-50%] w-[calc(33.333vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Create New Rubric</DialogTitle>
          <DialogDescription>
            Define evaluation criteria with scoring guidelines for each level (1-5)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <label className="text-sm font-semibold text-purple-900 mb-2 block">Rubric Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border-2 border-purple-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
              placeholder="e.g., Technical Skills Assessment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-purple-900">Rubric Items</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="bg-white border-2 border-purple-200 rounded-lg p-4 relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 hover:bg-red-100 hover:text-red-600 text-gray-500"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <RubricItemForm
                    item={item}
                    onChange={(updatedItem) => handleUpdateItem(index, updatedItem)}
                  />
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-8 text-purple-700 bg-white border-2 border-dashed border-purple-400 rounded-lg">
                  Click &quot;Add Item&quot; to create evaluation criteria
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Rubric
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
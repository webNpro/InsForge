import { useState, useEffect } from 'react';
import { FunctionsSidebar } from '@/features/functions/components/FunctionsSidebar';
import { FunctionsContent } from '@/features/functions/components/FunctionsContent';
import { SecretsContent } from '@/features/functions/components/SecretsContent';
import { useFunctions } from '../hooks/useFunctions';

export default function FunctionsPage() {
  // Load selected section from localStorage on mount
  const [selectedSection, setSelectedSection] = useState<'functions' | 'secrets'>(() => {
    return (
      (localStorage.getItem('selectedFunctionSection') as 'functions' | 'secrets') || 'functions'
    );
  });

  // Save selected section to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedFunctionSection', selectedSection);
  }, [selectedSection]);

  // Use custom hooks for data management
  const { clearSelection } = useFunctions();

  return (
    <div className="h-full flex">
      <FunctionsSidebar
        selectedSection={selectedSection}
        onSectionSelect={setSelectedSection}
        onBackToList={clearSelection}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSection === 'functions' ? <FunctionsContent /> : <SecretsContent />}
      </div>
    </div>
  );
}

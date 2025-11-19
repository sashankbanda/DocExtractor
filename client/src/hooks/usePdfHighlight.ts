import { useState } from 'react';
import { Citation, ExtractionField } from '@/types/extraction';

export function usePdfHighlight(citations: Citation[]) {
  const [activeField, setActiveField] = useState<ExtractionField | undefined>();

  const fieldCitations = activeField ? citations.filter((c) => c.field === activeField) : citations;

  const highlightField = (field: ExtractionField) => {
    setActiveField((prev) => (prev === field ? undefined : field));
  };

  return {
    activeField,
    fieldCitations,
    highlightField
  };
}


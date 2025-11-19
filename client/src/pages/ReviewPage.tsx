import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import PdfViewer from '@/components/PdfViewer';
import PolicyAccordion from '@/components/ExtractionAccordion/PolicyAccordion';
import { useAppStore } from '@/lib/zustand/store';
import { ExtractionField } from '@/types/extraction';
import { fetchExtraction, saveEdit } from '@/lib/api/documents';

interface ReviewPageProps {
  onContinue: () => void;
}

export default function ReviewPage({ onContinue }: ReviewPageProps) {
  const jobs = useAppStore((s) => s.jobs);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const setActiveFile = useAppStore((s) => s.setActiveFile);
  const extractions = useAppStore((s) => s.extractions);
  const setExtraction = useAppStore((s) => s.setExtraction);
  const readyJobs = useMemo(() => jobs.filter((job) => job.status === 'ready' && job.fileId), [jobs]);
  const [search, setSearch] = useState('');
  const [highlightField, setHighlightField] = useState<ExtractionField | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!activeFileId && readyJobs.length) {
      setActiveFile(readyJobs[0].fileId);
    }
  }, [activeFileId, readyJobs, setActiveFile]);

  const selectedFileId = activeFileId ?? readyJobs[0]?.fileId;

  const { data: extractionData, isFetching } = useQuery({
    queryKey: ['extraction', selectedFileId],
    enabled: Boolean(selectedFileId),
    queryFn: () => fetchExtraction(selectedFileId!),
    initialData: selectedFileId ? extractions[selectedFileId] : undefined,
    onSuccess: (payload) => {
      if (selectedFileId) {
        setExtraction(selectedFileId, payload);
      }
    }
  });

  const editMutation = useMutation({
    mutationFn: ({ field, value }: { field: ExtractionField; value: string }) =>
      saveEdit(selectedFileId!, field, value),
    onSuccess: (payload) => {
      if (selectedFileId) {
        setExtraction(selectedFileId, payload);
      }
    }
  });

  const handleEditField = async (field: ExtractionField, value: string) => {
    if (!selectedFileId) return;
    await editMutation.mutateAsync({ field, value });
  };

  const handleViewSource = (field: ExtractionField) => {
    setHighlightField(field);
    setRefreshKey(Date.now());
  };

  return (
    <section className="screen3">
      <div className="review-container">
        <div className="left-panel">
          <div className="card doc-viewer">
            <div className="viewer-header">
              <h3 className="m-0 text-base font-semibold">PDF Viewer</h3>
              <select
                className="policy-search-input w-48"
                value={selectedFileId ?? ''}
                onChange={(e) => setActiveFile(e.target.value || undefined)}
              >
                {readyJobs.map((job) => (
                  <option key={job.id} value={job.fileId}>
                    {job.filename}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-h-[420px]">
              <PdfViewer
                fileId={selectedFileId}
                citations={extractionData?.citations ?? []}
                activeField={highlightField}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
        <div className="right-panel">
          <div className="right-panel-header">
            <h3>Extracted Data {isFetching && <span className="text-xs text-muted">(refreshing)</span>}</h3>
            <div className="policy-search-container">
              <input
                type="text"
                className="policy-search-input"
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {selectedFileId ? (
            <PolicyAccordion
              record={extractionData?.data}
              search={search}
              onViewSource={handleViewSource}
              onEditField={handleEditField}
            />
          ) : (
            <div className="muted text-sm">Upload and process a document to review extracted data.</div>
          )}
          <div className="flex justify-end mt-4 gap-3">
            <button className="btn btn-secondary-action" onClick={() => useAppStore.getState().reset()}>
              Reset
            </button>
            <button className="btn btn-primary" onClick={onContinue} disabled={!readyJobs.length}>
              Continue to summary
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


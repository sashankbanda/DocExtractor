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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const selectedFileId = activeFileId ?? readyJobs[0]?.fileId;

  useEffect(() => {
    if (!activeFileId && readyJobs.length) {
      setActiveFile(readyJobs[0].fileId);
    }
  }, [activeFileId, readyJobs, setActiveFile]);

  // Reset page when file changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFileId]);

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

  const handlePageChange = (page: number, total: number) => {
    setCurrentPage(page);
    setTotalPages(total);
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <section className="screen3">
      <div className="review-container">
        <div className="left-panel">
          <div className="card doc-viewer">
            <div className="viewer-header">
              <div className="flex items-center gap-3">
                <select
                  className="policy-search-input"
                  value={selectedFileId ?? ''}
                  onChange={(e) => {
                    setActiveFile(e.target.value || undefined);
                    setCurrentPage(1);
                  }}
                >
                  {readyJobs.map((job) => (
                    <option key={job.id} value={job.fileId}>
                      {job.filename}
                    </option>
                  ))}
                </select>
                {selectedFileId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="w-8 h-8 flex items-center justify-center bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                      title="Previous Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"></path>
                      </svg>
                    </button>
                    <span className="text-sm text-slate-300 px-2 font-medium whitespace-nowrap">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="w-8 h-8 flex items-center justify-center bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
                      title="Next Page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-[420px]">
              <PdfViewer
                fileId={selectedFileId}
                citations={extractionData?.citations ?? []}
                activeField={highlightField}
                refreshKey={refreshKey}
                onPageChange={handlePageChange}
                externalPage={currentPage}
                hideControls={true}
              />
            </div>
          </div>
        </div>
        <div className="right-panel">
          <div className="right-panel-header" style={{ flexShrink: 0 }}>
            <h3>Extracted Data (Loss Run) {isFetching && <span className="text-xs text-muted">(refreshing)</span>}</h3>
            <div className="flex items-center gap-3">
              <div className="policy-search-container">
                <input
                  type="text"
                  className="policy-search-input"
                  placeholder="Search policies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={onContinue}>
                Finish
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
          </div>
        </div>
      </div>
    </section>
  );
}


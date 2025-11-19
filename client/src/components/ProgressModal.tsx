import { useMemo } from 'react';
import { useAppStore } from '@/lib/zustand/store';

interface ProgressModalProps {
  open: boolean;
}

export default function ProgressModal({ open }: ProgressModalProps) {
  const jobs = useAppStore((s) => s.jobs);

  const activeJob = useMemo(
    () => jobs.find((job) => job.status === 'uploading' || job.status === 'extracting'),
    [jobs]
  );

  const shouldShow = open && Boolean(activeJob);
  if (!shouldShow) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="progress-title">
          <span className="loading-spinner text-muted">○</span> Extracting data...
        </h2>
        <div className="text-lg font-semibold mb-2">{activeJob?.progress ?? 0}%</div>
        <div className="progress-bar-wrapper">
          <div className="progress-bar" style={{ width: `${activeJob?.progress ?? 0}%` }} />
        </div>
        <div className="status-text">
          {activeJob ? `${activeJob.status.toUpperCase()} — ${activeJob.filename}` : 'Preparing queue...'}
        </div>
        <div className="file-status-list space-y-2 text-left text-sm text-muted">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-2">
              <span
                className={
                  job.status === 'ready'
                    ? 'status-dot-success'
                    : job.status === 'error'
                      ? 'status-dot-processing bg-error'
                      : 'status-dot-processing'
                }
              />
              <span className={job.status === 'ready' ? 'text-secondary' : ''}>
                {job.status.toUpperCase()} — {job.filename}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


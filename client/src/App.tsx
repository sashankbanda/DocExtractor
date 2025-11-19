import { useMemo, useState } from 'react';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import SummaryPage from './pages/SummaryPage';
import ProgressModal from './components/ProgressModal';
import { useAppStore } from './lib/zustand/store';
import './assets/theme.css';

type View = 'upload' | 'review' | 'summary';

export default function App() {
  const jobs = useAppStore((s) => s.jobs);
  const [view, setView] = useState<View>('upload');

  const showProgress = useMemo(() => jobs.some((job) => ['uploading', 'extracting'].includes(job.status)), [jobs]);

  return (
    <div className="min-h-screen bg-bg text-white font-['Inter',_system-ui]">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface border-b border-border flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="logo">DE</div>
          <div>
            <h1 className="text-lg font-semibold m-0 leading-tight">Document Extractor</h1>
            <p className="text-xs text-muted m-0">Data Xtractor</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary-action" onClick={() => setView('upload')}>
            Upload
          </button>
          <button className="btn btn-secondary-action" onClick={() => setView('review')}>
            Review
          </button>
          <button className="btn btn-primary" onClick={() => setView('summary')}>
            Summary
          </button>
        </div>
      </header>

      <main className="pt-24 pb-6 px-6 min-h-screen">
        {view === 'upload' && <UploadPage onContinue={() => setView('review')} />}
        {view === 'review' && <ReviewPage onContinue={() => setView('summary')} />}
        {view === 'summary' && (
          <SummaryPage
            onRestart={() => {
              useAppStore.getState().reset();
              setView('upload');
            }}
          />
        )}
      </main>

      <ProgressModal open={showProgress} />
    </div>
  );
}


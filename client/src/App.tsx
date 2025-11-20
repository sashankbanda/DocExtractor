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
          <h1 className="text-lg font-semibold m-0 leading-tight">Document Extractor</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn-secondary-action" onClick={() => setView('upload')}>
            Upload
          </button>
          <button className="btn btn-primary" onClick={() => setView('summary')}>
            Summary
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-muted hover:text-white transition-colors cursor-pointer" title="Help">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <path d="M12 17h.01"></path>
            </svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-muted hover:text-white transition-colors cursor-pointer" title="User Profile">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
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


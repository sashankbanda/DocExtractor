import UploadCard from '@/components/UploadCard';
import { useAppStore } from '@/lib/zustand/store';

interface UploadPageProps {
  onContinue: () => void;
}

export default function UploadPage({ onContinue }: UploadPageProps) {
  const jobs = useAppStore((s) => s.jobs);
  const ready = jobs.some((job) => job.status === 'ready');

  return (
    <div className="flex flex-col gap-6">
      <UploadCard onReady={onContinue} />
      <div className="flex justify-center">
        <button className="btn btn-primary" disabled={!ready} onClick={onContinue}>
          Proceed to review
        </button>
      </div>
    </div>
  );
}


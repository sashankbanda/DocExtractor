import SummaryCard from '@/components/SummaryCard';
import { useAppStore } from '@/lib/zustand/store';
import { downloadExport } from '@/lib/api/documents';

interface SummaryPageProps {
  onRestart: () => void;
}

export default function SummaryPage({ onRestart }: SummaryPageProps) {
  const readyJobs = useAppStore((s) => s.jobs.filter((job) => job.status === 'ready' && job.fileId));

  const stats = [
    { label: 'Documents processed', value: String(readyJobs.length) },
    { label: 'Policies extracted', value: String(readyJobs.length) },
    { label: 'Claims parsed', value: String(readyJobs.length) }
  ];

  const activeFileId = readyJobs[0]?.fileId;

  const handleExport = async (format: 'json' | 'xlsx') => {
    if (!activeFileId) return;
    const blob = await downloadExport(activeFileId, format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction_${activeFileId}.${format === 'json' ? 'json' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <SummaryCard
      stats={stats}
      onExportJson={() => handleExport('json')}
      onExportExcel={() => handleExport('xlsx')}
      onRestart={onRestart}
    />
  );
}


import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuid } from 'uuid';
import { useAppStore } from '@/lib/zustand/store';
import { uploadFile, extractFile } from '@/lib/api/documents';

const MAX_FILES = 5;
const MAX_SIZE = 20 * 1024 * 1024;
const SUPPORTED_TYPES = ['pdf', 'xls', 'xlsx', 'csv'];

interface UploadCardProps {
  onReady?: () => void;
}

export default function UploadCard({ onReady }: UploadCardProps) {
  const jobs = useAppStore((s) => s.jobs);
  const upsertJob = useAppStore((s) => s.upsertJob);
  const updateJob = useAppStore((s) => s.updateJob);
  const setExtraction = useAppStore((s) => s.setExtraction);
  const setActiveFile = useAppStore((s) => s.setActiveFile);

  const processQueue = async (files: File[]) => {
    for (const file of files) {
      const tempId = uuid();
      upsertJob({
        id: tempId,
        localFile: file,
        filename: file.name,
        status: 'queued',
        progress: 0
      });

      try {
        updateJob(tempId, { status: 'uploading' });
        const { fileId } = await uploadFile(file);
        updateJob(tempId, { fileId, progress: 40 });
        updateJob(tempId, { status: 'extracting', progress: 65 });
        const extraction = await extractFile(fileId);
        setExtraction(fileId, extraction);
        updateJob(tempId, { status: 'ready', progress: 100 });
        setActiveFile(fileId);
        onReady?.();
      } catch (error) {
        console.error(error);
        updateJob(tempId, { status: 'error', error: 'Failed to process file' });
      }
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const allowed = acceptedFiles.filter((file) =>
        SUPPORTED_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext))
      );
      const slots = Math.max(0, MAX_FILES - jobs.length);
      const trimmed = allowed.slice(0, slots).filter((file) => file.size <= MAX_SIZE);
      processQueue(trimmed);
    },
    [jobs.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    maxFiles: MAX_FILES,
    maxSize: MAX_SIZE,
    onDrop,
    multiple: true
  });

  return (
    <section className="screen1">
      <div className="card upload-card">
        <div
          {...getRootProps()}
          className={`drag-drop-area transition border-dashed border-2 ${isDragActive ? 'border-primary bg-primary/5' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="upload-icon text-primary text-3xl mb-3">⬆</div>
          <p className="upload-text">Drop files or click to browse</p>
          <p className="support-text">
            Supports PDF / XLS / XLSX / CSV · Max 20 MB · Up to 5 files, processed sequentially
          </p>
          <button type="button" className="btn-small-manual">
            Select from computer
          </button>
        </div>

        <div className="files-list-container">
          {jobs.map((job) => (
            <div key={job.id} className="file-item-full">
              <div className="file-icon">{job.filename.split('.').pop()?.toUpperCase()}</div>
              <div className="file-info">
                <div className="file-name">{job.filename}</div>
                <div className="support-text">
                  {job.status.toUpperCase()} · {job.progress}%
                </div>
              </div>
              <div className={job.status === 'ready' ? 'status-dot-success' : 'status-dot-processing'} />
            </div>
          ))}
          {jobs.length === 0 && <p className="support-text text-center">No files queued yet.</p>}
        </div>
      </div>
    </section>
  );
}


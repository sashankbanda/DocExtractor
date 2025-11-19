import { useEffect, useMemo, useRef, useState } from 'react';
import { Citation, Bounds } from '@/types/extraction';
import { getPdfPageUrl } from '@/lib/api/documents';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

interface PdfViewerProps {
  fileId?: string;
  citations: Citation[];
  activeField?: string;
  refreshKey?: number;
}

export default function PdfViewer({ fileId, citations, activeField, refreshKey }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [page] = useState(1);
  const [imageSize, setImageSize] = useState({ width: PAGE_WIDTH, height: PAGE_HEIGHT });

  const imageSrc = useMemo(() => {
    if (!fileId) return undefined;
    return `${getPdfPageUrl(fileId, page)}?cache=${Date.now()}`;
  }, [fileId, page, refreshKey]);

  useEffect(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const onLoad = () => {
      setImageSize({ width: img.naturalWidth || PAGE_WIDTH, height: img.naturalHeight || PAGE_HEIGHT });
    };
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [imageSrc]);

  useEffect(() => {
    if (!activeField || !containerRef.current) return;
    const highlight = citations.find((c) => c.field === activeField && c.bounds);
    if (!highlight?.bounds) return;
    const scaleY = imageSize.height / PAGE_HEIGHT;
    const targetTop = highlight.bounds.y * scaleY;
    containerRef.current.scrollTo({
      top: Math.max(targetTop - 80, 0),
      behavior: 'smooth'
    });
  }, [activeField, citations, imageSize]);

  const highlightRects = useMemo(() => {
    if (!citations.length) return [];
    const fields = activeField ? citations.filter((c) => c.field === activeField) : citations;
    const scaleX = imageSize.width / PAGE_WIDTH;
    const scaleY = imageSize.height / PAGE_HEIGHT;
    return fields
      .filter((c) => c.bounds)
      .map((c) => {
        const bounds = c.bounds as Bounds;
        return {
          field: c.field,
          page: c.page,
          style: {
            left: bounds.x * scaleX,
            top: bounds.y * scaleY,
            width: bounds.width * scaleX,
            height: bounds.height * scaleY
          }
        };
      });
  }, [citations, activeField, imageSize]);

  return (
    <div className="doc-viewer relative overflow-auto" ref={containerRef}>
      {imageSrc ? (
        <>
          <img ref={imageRef} src={imageSrc} alt="PDF page" className="w-full object-contain" />
          <div className="highlight-layer absolute inset-0 pointer-events-none">
            {highlightRects.map((rect) => (
              <span
                key={`${rect.field}-${rect.style.left}-${rect.style.top}`}
                className="absolute border border-primary bg-primary/30 rounded"
                style={{
                  left: rect.style.left,
                  top: rect.style.top,
                  width: rect.style.width,
                  height: rect.style.height
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-muted text-sm">Select a processed file</div>
      )}
    </div>
  );
}


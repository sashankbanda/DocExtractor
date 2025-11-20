import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Citation, Bounds } from '@/types/extraction';
import { getPdfPageUrl, getPageCount } from '@/lib/api/documents';

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
  const [page, setPage] = useState(1);
  const [imageSize, setImageSize] = useState({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
  const [zoom, setZoom] = useState(1);

  // Get total page count
  const { data: pageData } = useQuery({
    queryKey: ['pageCount', fileId],
    queryFn: () => getPageCount(fileId!),
    enabled: Boolean(fileId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const totalPages = pageData?.pageCount || 1;

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

  // Navigate to the page of the active field citation
  useEffect(() => {
    if (!activeField || !containerRef.current) return;
    const highlight = citations.find((c) => c.field === activeField && c.bounds && c.page);
    if (!highlight?.bounds || !highlight.page) return;
    
    // Navigate to the correct page
    if (highlight.page !== page) {
      setPage(highlight.page);
    }
    
    // Scroll to the highlight after image loads
    const scrollToHighlight = () => {
      if (!containerRef.current) return;
      const scaleY = imageSize.height / PAGE_HEIGHT;
      const targetTop = highlight.bounds!.y * scaleY;
      containerRef.current.scrollTo({
        top: Math.max(targetTop - 80, 0),
        behavior: 'smooth'
      });
    };
    
    // Wait for image to load before scrolling
    if (imageRef.current?.complete) {
      scrollToHighlight();
    } else {
      imageRef.current?.addEventListener('load', scrollToHighlight, { once: true });
    }
  }, [activeField, citations, imageSize, page]);

  const highlightRects = useMemo(() => {
    // Only show highlights when activeField is set (user clicked View Source)
    if (!activeField || !citations.length) return [];
    const fields = citations.filter((c) => c.field === activeField && c.bounds);
    const scaleX = (imageSize.width / PAGE_WIDTH) * zoom;
    const scaleY = (imageSize.height / PAGE_HEIGHT) * zoom;
    return fields
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
  }, [citations, activeField, imageSize, zoom]);

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <div className="doc-viewer-container flex flex-col h-full">
      {/* Page Navigation Controls */}
      {fileId && (
        <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 shadow-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors font-medium"
              title="Previous Page"
            >
              ‹ Prev
            </button>
            <span className="text-sm text-slate-300 px-3 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors font-medium"
              title="Next Page"
            >
              Next ›
            </button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="p-1.5 bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              title="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <span className="text-sm text-slate-300 px-2 font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-1.5 bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors"
              title="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1.5 text-xs bg-slate-700 text-slate-200 border border-slate-600 rounded hover:bg-slate-600 transition-colors font-medium"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      <div className="doc-viewer relative overflow-auto flex-1 bg-slate-900" ref={containerRef}>
        {imageSrc ? (
          <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
            <img 
              ref={imageRef} 
              src={imageSrc} 
              alt={`PDF page ${page}`} 
              className="w-full object-contain" 
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            <div className="highlight-layer absolute inset-0 pointer-events-none" style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}>
              {highlightRects
                .filter((rect) => rect.page === page) // Only show highlights for current page
                .map((rect) => (
                  <span
                    key={`${rect.field}-${rect.style.left}-${rect.style.top}`}
                    className="absolute border-2 border-blue-500 bg-blue-500/40 rounded shadow-lg"
                    style={{
                      left: rect.style.left,
                      top: rect.style.top,
                      width: rect.style.width,
                      height: rect.style.height,
                      zIndex: 10
                    }}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Select a processed file</div>
        )}
      </div>
    </div>
  );
}


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
  onPageChange?: (page: number, totalPages: number) => void;
  externalPage?: number;
  hideControls?: boolean;
}

export default function PdfViewer({ fileId, citations, activeField, refreshKey, onPageChange, externalPage, hideControls = false }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [page, setPage] = useState(1);
  const [imageSize, setImageSize] = useState({ width: PAGE_WIDTH, height: PAGE_HEIGHT });
  const [zoom, setZoom] = useState(1);
  
  // Use external page if provided
  const currentPage = externalPage !== undefined ? externalPage : page;

  // Get total page count
  const { data: pageData } = useQuery({
    queryKey: ['pageCount', fileId],
    queryFn: () => getPageCount(fileId!),
    enabled: Boolean(fileId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const totalPages = pageData?.pageCount || 1;

  // Notify parent of page changes and initial page count
  useEffect(() => {
    if (onPageChange) {
      if (externalPage === undefined) {
        // Internal page control - notify on page changes
        onPageChange(page, totalPages);
      } else if (totalPages > 0) {
        // External page control - notify initial page count when available
        onPageChange(externalPage, totalPages);
      }
    }
  }, [page, totalPages, onPageChange, externalPage]);

  // Sync with external page changes
  useEffect(() => {
    if (externalPage !== undefined && externalPage !== page) {
      setPage(externalPage);
    }
  }, [externalPage, page]);

  const imageSrc = useMemo(() => {
    if (!fileId) return undefined;
    return `${getPdfPageUrl(fileId, currentPage)}?cache=${Date.now()}`;
  }, [fileId, currentPage, refreshKey]);

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
    if (highlight.page !== currentPage) {
      if (externalPage === undefined) {
        setPage(highlight.page);
      } else if (onPageChange) {
        onPageChange(highlight.page, totalPages);
      }
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
      imageRef.current?.addEventListener('load', scrollToHighlight, { once: true       });
    }
  }, [activeField, citations, imageSize, currentPage, externalPage, onPageChange, totalPages]);

  const highlightRects = useMemo(() => {
    // Only show highlights when activeField is set (user clicked View Source)
    if (!activeField || !citations.length) return [];
    const fields = citations.filter((c) => c.field === activeField && c.bounds);
    
    // Calculate scale factors based on actual image dimensions vs PDF dimensions
    // The image is scaled by zoom, so we need to account for that
    const imageScaleX = imageSize.width / PAGE_WIDTH;
    const imageScaleY = imageSize.height / PAGE_HEIGHT;
    
    return fields
      .map((c) => {
        const bounds = c.bounds as Bounds;
        return {
          field: c.field,
          page: c.page,
          style: {
            left: `${bounds.x * imageScaleX}px`,
            top: `${bounds.y * imageScaleY}px`,
            width: `${bounds.width * imageScaleX}px`,
            height: `${bounds.height * imageScaleY}px`
          }
        };
      });
  }, [citations, activeField, imageSize]);

  const goToPageInternal = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      if (externalPage === undefined) {
        setPage(newPage);
      } else if (onPageChange) {
        onPageChange(newPage, totalPages);
      }
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };


  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Check if Ctrl/Cmd key is pressed (standard zoom behavior)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const container = containerRef.current;
      if (!container) return;
      
      // Get mouse position relative to container
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Get current scroll position
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      
      // Calculate zoom factor (positive delta = zoom in, negative = zoom out)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));
      
      if (newZoom !== zoom) {
        // Calculate new scroll position to keep zoom point under cursor
        const zoomRatio = newZoom / zoom;
        const newScrollLeft = x * (zoomRatio - 1) + scrollLeft * zoomRatio;
        const newScrollTop = y * (zoomRatio - 1) + scrollTop * zoomRatio;
        
        setZoom(newZoom);
        
        // Update scroll position after zoom
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollLeft = newScrollLeft;
            containerRef.current.scrollTop = newScrollTop;
          }
        }, 0);
      }
    }
  };

  return (
    <div className="doc-viewer-container flex flex-col h-full">
      {/* Page Navigation Controls - only show if not hidden */}
      {fileId && !hideControls && (
        <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 shadow-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPageInternal(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors font-medium"
              title="Previous Page"
            >
              ‹ Prev
            </button>
            <span className="text-sm text-slate-300 px-3 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPageInternal(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm bg-slate-700 text-slate-200 border border-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors font-medium"
              title="Next Page"
            >
              Next ›
            </button>
          </div>
          
          {/* Zoom Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 px-2">
              Zoom: {Math.round(zoom * 100)}% (Ctrl + Scroll)
            </span>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-xs bg-slate-700 text-slate-200 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}
      
      <div 
        className="doc-viewer relative overflow-auto flex-1 bg-slate-900" 
        ref={containerRef}
        onWheel={handleWheel}
        style={{ cursor: 'grab' }}
      >
        {imageSrc ? (
          <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
            <img 
              ref={imageRef} 
              src={imageSrc} 
              alt={`PDF page ${currentPage}`} 
              className="w-full object-contain" 
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            <div 
              className="highlight-layer absolute pointer-events-none"
              style={{
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transform: `scale(${1 / zoom})`,
                transformOrigin: 'top left'
              }}
            >
              {highlightRects
                .filter((rect) => rect.page === currentPage) // Only show highlights for current page
                .map((rect, idx) => (
                  <span
                    key={`${rect.field}-${rect.style.left}-${rect.style.top}-${idx}`}
                    className="absolute border-2 border-yellow-400 bg-yellow-400/40 rounded shadow-lg"
                    style={{
                      left: rect.style.left,
                      top: rect.style.top,
                      width: rect.style.width,
                      height: rect.style.height,
                      zIndex: 10,
                      boxShadow: '0 0 0 1px rgba(250, 204, 21, 0.6), 0 0 6px rgba(250, 204, 21, 0.4)'
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


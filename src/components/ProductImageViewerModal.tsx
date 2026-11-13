import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize, Minimize,
  ChevronLeft, ChevronRight, X, Rotate3d, Compass, RefreshCw
} from 'lucide-react';

interface ProductImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productName?: string;
  fallbackImage?: string;
}

export const ProductImageViewerModal: React.FC<ProductImageViewerModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  productName = 'Product View',
  fallbackImage = '/logo.png'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Pinch-to-zoom tracking
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialTouchScaleRef = useRef<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const safeFallback = (fallbackImage && fallbackImage.trim()) || '/logo.png';
  const filteredImages = Array.isArray(images)
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
    : [];
  const validImages = filteredImages.length > 0 ? filteredImages : [safeFallback];

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, validImages.length - 1)));
      resetTransforms();
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex, validImages.length]);

  const resetTransforms = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.35, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.35, 1);
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleRotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const handlePrev = useCallback(() => {
    resetTransforms();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
  }, [resetTransforms, validImages.length]);

  const handleNext = useCallback(() => {
    resetTransforms();
    setCurrentIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
  }, [resetTransforms, validImages.length]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotateClockwise();
      } else if (e.key === '0') {
        resetTransforms();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose, resetTransforms]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale(prev => Math.min(prev + 0.2, 4));
    } else {
      setScale(prev => {
        const next = Math.max(prev - 0.2, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag panning (when zoomed in)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pinch-to-zoom & Mobile drag
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      initialTouchDistanceRef.current = dist;
      initialTouchScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      // Pinching
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const factor = dist / initialTouchDistanceRef.current;
      const targetScale = Math.max(1, Math.min(4, initialTouchScaleRef.current * factor));
      setScale(targetScale);
      if (targetScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Panning
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    initialTouchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Double click or tap to toggle zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetTransforms();
    } else {
      setScale(2.2);
    }
  };

  if (!isOpen) return null;

  const currentImage = (validImages[currentIndex] && validImages[currentIndex].trim()) || safeFallback;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md text-white select-none animate-fadeIn"
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-slate-900/80 border-b border-slate-800 z-20">
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-[#FF6000] border border-orange-500/30 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-slate-100" title={productName}>
              {productName}
            </h3>
            <p className="text-[11px] text-slate-400">
              Image {currentIndex + 1} of {validImages.length} · {Math.round(scale * 100)}% Zoom {rotation !== 0 ? `· ${rotation}°` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate CCW */}
          <button
            type="button"
            onClick={handleRotateCounterClockwise}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:flex"
            title="Rotate Left 90°"
            aria-label="Rotate Left"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Rotate CW */}
          <button
            type="button"
            onClick={handleRotateClockwise}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Rotate Right 90° (R)"
            aria-label="Rotate Right"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reset Zoom & Rotation */}
          {(scale !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0) && (
            <button
              type="button"
              onClick={resetTransforms}
              className="p-2 rounded-xl bg-orange-600/30 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40 transition-colors cursor-pointer"
              title="Reset View (0)"
              aria-label="Reset View"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-crosshair touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {/* Navigation Arrow: Previous */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105"
            title="Previous Image (←)"
            aria-label="Previous Image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation Arrow: Next */}
        {validImages.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105"
            title="Next Image (→)"
            aria-label="Next Image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Displayed Image with smooth CSS transform */}
        <div
          className="transition-transform duration-75 ease-out inline-block max-w-[92vw] max-h-[82vh]"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}
        >
          <img
            ref={imageRef}
            src={currentImage}
            alt={`${productName} view ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[76vh] object-contain drop-shadow-2xl rounded-lg pointer-events-none"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
        </div>

        {/* Hint Overlay (fades out after initial view) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 backdrop-blur-xs">
          <span>Scroll or double-click to zoom</span>
          <span className="text-slate-500">•</span>
          <span>Click & drag to inspect details</span>
          <span className="text-slate-500">•</span>
          <span>Arrow keys to navigate</span>
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto z-20">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                resetTransforms();
                setCurrentIndex(idx);
              }}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                currentIndex === idx
                  ? 'border-orange-500 ring-2 ring-orange-400/50 scale-105'
                  : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
              }`}
            >
              <img
                src={img && img.trim() ? img : safeFallback}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = safeFallback;
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

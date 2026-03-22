'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tag, X } from 'lucide-react';

interface ImageItem {
  src: string;
  alt: string;
}

interface ImageZoomProps {
  images: ImageItem[];
}

function PlaceholderImage({ alt, className }: { alt: string; className?: string }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className ?? ''}`}
      aria-label={alt}
    >
      <Tag className="w-10 h-10 text-gray-400 dark:text-gray-500" />
    </div>
  );
}

export default function ImageZoom({ images }: ImageZoomProps) {
  const displayImages = images.length > 0 ? images.slice(0, 4) : [
    { src: '', alt: 'Placeholder 1' },
    { src: '', alt: 'Placeholder 2' },
    { src: '', alt: 'Placeholder 3' },
    { src: '', alt: 'Placeholder 4' },
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const mainImage = displayImages[selectedIndex] ?? displayImages[0];

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setOffset({ x: 0, y: 0 });
    setTransformOrigin('center center');
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${x}% ${y}%`);
  }, [isDragging, dragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for mobile panning
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      const y = ((touch.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${x}% ${y}%`);
    }
  }, []);

  const renderImage = (
    image: ImageItem,
    className: string
  ) => {
    if (!image.src) {
      return <PlaceholderImage alt={image.alt} className={className} />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.src}
        alt={image.alt}
        className={`object-contain ${className}`}
      />
    );
  };

  return (
    <>
      {/* Main layout: main image on top, carousel below */}
      <div className="flex flex-col gap-4">
        {/* Main image */}
        <button
          type="button"
          onClick={() => {
            setOffset({ x: 0, y: 0 });
            setLightboxOpen(true);
          }}
          className="w-full aspect-square rounded-xl overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800"
          aria-label={`Zoom into ${mainImage.alt}`}
        >
          {renderImage(mainImage, 'w-full h-full')}
        </button>

        {/* Carousel thumbnails below */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`h-20 w-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                selectedIndex === index
                  ? 'border-primary-500'
                  : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
              }`}
              aria-label={`View ${img.alt}`}
            >
              {renderImage(img, 'w-full h-full')}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox / fullscreen modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
          onMouseUp={handleMouseUp}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Zoomed image container */}
          <div
            ref={containerRef}
            className="max-w-[90vw] max-h-[90vh] overflow-hidden rounded-xl cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
          >
            {mainImage.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainImage.src}
                alt={mainImage.alt}
                className="w-[90vw] h-[90vh] object-contain select-none"
                draggable={false}
                style={{
                  transformOrigin,
                  transform: `scale(1.5) translate(${offset.x / 1.5}px, ${offset.y / 1.5}px)`,
                  transition: isDragging ? 'none' : 'transform-origin 0.15s ease-out',
                }}
              />
            ) : (
              <PlaceholderImage
                alt={mainImage.alt}
                className="w-[45vw] h-[45vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

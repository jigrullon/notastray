'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const mainImage = displayImages[selectedIndex] ?? displayImages[0];

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
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
        className={`object-cover ${className}`}
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
          onClick={() => setLightboxOpen(true)}
          className="w-full aspect-square rounded-xl overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className="max-w-[90vw] max-h-[90vh] overflow-auto rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="origin-center transform scale-[2] sm:scale-[2.5] md:scale-[3] transition-transform duration-300">
              {mainImage.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage.src}
                  alt={mainImage.alt}
                  className="max-w-[45vw] max-h-[45vh] object-contain rounded-lg"
                />
              ) : (
                <PlaceholderImage
                  alt={mainImage.alt}
                  className="w-[45vw] h-[45vh] rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

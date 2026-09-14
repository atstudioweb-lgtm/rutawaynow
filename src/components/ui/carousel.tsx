"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type PerViewConfig =
  | number
  | { mobile: number; tablet: number; desktop: number };

interface CarouselProps {
  children: ReactNode;
  className?: string;
  itemsPerView?: PerViewConfig;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  ariaLabels?: {
    region?: string;
    previous?: string;
    next?: string;
    goTo?: string;
  };
}

function resolvePerView(config: PerViewConfig, width: number): number {
  if (typeof config === "number") return config;
  if (width < 640) return config.mobile;
  if (width < 1024) return config.tablet;
  return config.desktop;
}

export function Carousel({
  children,
  className,
  itemsPerView = { mobile: 1, tablet: 2, desktop: 3 },
  autoPlay = false,
  autoPlayInterval = 5000,
  showArrows = true,
  showDots = true,
  ariaLabels,
}: CarouselProps) {
  const labels = {
    region: ariaLabels?.region ?? "Carousel",
    previous: ariaLabels?.previous ?? "Previous slide",
    next: ariaLabels?.next ?? "Next slide",
    goTo: ariaLabels?.goTo ?? "Go to slide {n}",
  };

  const slides = Children.toArray(children);
  const rawCount = slides.length;

  const [perView, setPerView] = useState<number>(() =>
    typeof itemsPerView === "number" ? itemsPerView : 1,
  );
  const [itemWidth, setItemWidth] = useState(0);
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const pv = resolvePerView(itemsPerView, width);
      setPerView(pv);
      setItemWidth(width / pv);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemsPerView]);

  useEffect(() => {
    if (!autoPlay || rawCount <= 1) return;
    const id = window.setInterval(() => {
      if (!isDraggingRef.current) {
        setCurrent((entry) => (entry + 1) % rawCount);
      }
    }, autoPlayInterval);
    return () => window.clearInterval(id);
  }, [autoPlay, autoPlayInterval, rawCount]);

  const goToNext = useCallback(() => {
    if (rawCount === 0) return;
    setDragDelta(0);
    setCurrent((entry) => (entry + 1) % rawCount);
  }, [rawCount]);

  const goToPrev = useCallback(() => {
    if (rawCount === 0) return;
    setDragDelta(0);
    setCurrent((entry) => (entry - 1 + rawCount) % rawCount);
  }, [rawCount]);

  const goToSlide = useCallback(
    (target: number) => {
      if (rawCount === 0) return;
      setDragDelta(0);
      setCurrent((entry) => {
        const base = target % rawCount;
        const candidates = [base - rawCount, base, base + rawCount];
        let best = base;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const candidate of candidates) {
          const distance = Math.abs(candidate - entry);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = candidate;
          }
        }
        return best;
      });
    },
    [rawCount],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rawCount === 0) return;
    dragStartXRef.current = event.clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragDelta(event.clientX - dragStartXRef.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    if (itemWidth > 0 && Math.abs(dragDelta) > itemWidth * 0.25) {
      if (dragDelta < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    setDragDelta(0);
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  };

  if (rawCount === 0) return null;

  const activeIndex = ((current % rawCount) + rawCount) % rawCount;
  const physicalIndex = rawCount + activeIndex;
  const baseOffset = -physicalIndex * itemWidth + (isDragging ? dragDelta : 0);
  const slideBaseStyle = {
    flex: `0 0 ${100 / perView}%`,
    minWidth: 0,
  };

  return (
    <div
      className={cn("relative", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        className="relative overflow-y-visible"
        style={{ overflowX: "clip" }}
      >
        <div
          className="flex select-none"
          role="list"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `translate3d(${baseOffset}px, 0, 0)`,
            transition: isDragging
              ? "none"
              : "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
            touchAction: "pan-y",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={`first-${index}`}
              role="listitem"
              className="shrink-0"
              style={slideBaseStyle}
            >
              {slide}
            </div>
          ))}
          {slides.map((slide, index) => (
            <div
              key={`middle-${index}`}
              role="listitem"
              className="shrink-0"
              style={slideBaseStyle}
            >
              {slide}
            </div>
          ))}
          {slides.map((slide, index) => (
            <div
              key={`last-${index}`}
              role="listitem"
              className="shrink-0"
              style={slideBaseStyle}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {showArrows && rawCount > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label={labels.previous}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 text-indigo-600 shadow-lg transition-colors hover:bg-white hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label={labels.next}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 text-indigo-600 shadow-lg transition-colors hover:bg-white hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {showDots && rawCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((_, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={labels.goTo.replace("{n}", String(index + 1))}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-300",
                  isActive
                    ? "w-5 bg-indigo-600"
                    : "bg-slate-300 hover:bg-indigo-300",
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Carousel;
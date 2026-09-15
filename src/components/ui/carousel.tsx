"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Carousel({
  children,
  className,
  ariaLabel = "Carousel",
}: CarouselProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      ref.current?.scrollBy({ left: -300, behavior: "smooth" });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      ref.current?.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex snap-x snap-mandatory items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Carousel;
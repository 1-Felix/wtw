"use client";

import { useState } from "react";
import Image from "next/image";

interface PosterImageProps {
  itemId: string | null;
  title: string;
  className?: string;
}

export function PosterImage({ itemId, title, className = "" }: PosterImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!itemId || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-raised ${className}`}
      >
        <span className="px-2 text-center text-xs font-medium text-muted-foreground">
          {title}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={`/api/images/${itemId}`}
      alt={title}
      fill
      className="object-cover"
      onError={() => setHasError(true)}
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 200px"
    />
  );
}

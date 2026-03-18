"use client";

import { forwardRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
}

export const SearchFilter = forwardRef<HTMLInputElement, SearchFilterProps>(
  function SearchFilter(
    { query, onQueryChange, placeholder = "Search by title..." },
    ref
  ) {
    const [focused, setFocused] = useState(false);

    return (
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {query.length > 0 ? (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          !focused && (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground [@media(pointer:fine)]:inline-block">
              /
            </kbd>
          )
        )}
      </div>
    );
  }
);

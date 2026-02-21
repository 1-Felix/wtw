"use client";

import { Search, X } from "lucide-react";

interface SearchFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
}

export function SearchFilter({
  query,
  onQueryChange,
  placeholder = "Search by title...",
}: SearchFilterProps) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {query.length > 0 && (
        <button
          onClick={() => onQueryChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

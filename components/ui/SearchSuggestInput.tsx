"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { SearchSuggestion } from "../../lib/search-suggestions";
import { cn } from "../../lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  suggestions: SearchSuggestion[];
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  inputClassName?: string;
  /** Magnifying glass on the left (builder hero search) */
  withIcon?: boolean;
  /** Element id to scroll into view on Enter / suggestion pick */
  resultsAnchorId?: string;
};

function scrollToResults(anchorId?: string) {
  if (!anchorId || typeof document === "undefined") return;
  // Wait so filtered results can paint after onChange
  window.setTimeout(() => {
    document.getElementById(anchorId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 50);
}

export function SearchSuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  "aria-label": ariaLabel,
  className,
  inputClassName,
  withIcon = false,
  resultsAnchorId,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const show = open && value.trim().length > 0 && suggestions.length > 0;

  useEffect(() => {
    setActive(0);
  }, [value, suggestions.length]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goToResults = () => {
    setOpen(false);
    scrollToResults(resultsAnchorId);
  };

  const pick = (s: SearchSuggestion) => {
    onChange(s.value);
    goToResults();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {withIcon && (
        <svg
          className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      <input
        type="search"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && show) {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, suggestions.length - 1));
            return;
          }
          if (e.key === "ArrowUp" && show) {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (show && suggestions[active]) {
              pick(suggestions[active]);
            } else {
              goToResults();
            }
          }
        }}
        className={cn(
          "w-full rounded-sm border border-gold-400/30 bg-paper text-sm text-ink placeholder:text-ink-60 focus:outline-none focus:ring-2 focus:ring-gold-400",
          withIcon ? "py-3 pl-11 pr-4" : "px-4 py-2.5",
          inputClassName
        )}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-auto rounded-sm border border-gold-400/30 bg-paper py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                id={`${listId}-${i}`}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors",
                  i === active
                    ? "bg-gold-400/15 text-ink"
                    : "text-ink-60 hover:bg-paper-soft hover:text-ink"
                )}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                <span className="font-medium text-ink">{s.label}</span>
                {s.secondary && (
                  <span className="text-[11px] uppercase tracking-wider text-gold-400/80">
                    {s.kind === "house" ? "Casa" : s.secondary}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

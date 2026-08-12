import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../hooks/useDebounce";
import { fetchApi } from "../api/client";
import type { SearchResult } from "../types";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ className = "", autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    fetchApi<SearchResult>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => {
        setResults(data);
        setOpen(true);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNavigate(type: string, uuid: string) {
    setOpen(false);
    setQuery("");
    if (type === "tools") {
      navigate("/tools");
    } else if (type === "deployments") {
      navigate(`/deployments/${uuid}`);
    } else if (type === "tasks") {
      navigate("/scheduled-tasks");
    } else {
      navigate(`/${type}/${uuid}`);
    }
  }

  const totalResults = results
    ? Object.values(results).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;

  const categoryLabels: Record<string, string> = {
    projects: "Projects",
    applications: "Applications",
    services: "Services",
    databases: "Databases",
    servers: "Servers",
    deployments: "Deployments",
    tasks: "Scheduled Tasks",
    tools: "Tools",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search projects, apps, databases, tools..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          autoFocus={autoFocus}
          className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-blue-500" />
          </div>
        )}
      </div>

      {open && results && totalResults === 0 && !loading && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-gray-700 bg-gray-900 p-4 text-center text-sm text-gray-500 shadow-lg">
          No results found
        </div>
      )}

      {open && results && totalResults > 0 && (
        <div className="absolute top-full z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-gray-700 bg-gray-900 shadow-lg">
          {Object.entries(results).map(([category, items]) => {
            if (!Array.isArray(items) || items.length === 0) return null;
            return (
              <div key={category}>
                <div className="px-3 py-1.5 text-xs font-semibold uppercase text-gray-500 bg-gray-800/50">
                  {categoryLabels[category] || category}
                </div>
                {items.map((item) => (
                  <button
                    key={item.uuid}
                    onClick={() => handleNavigate(category, item.uuid)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-xs text-gray-600">{item.uuid.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

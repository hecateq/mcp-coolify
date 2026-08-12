import { useEffect, useState } from "react";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/healthz")
      .then((r) => r.json())
      .then((d) => setConnected(d.ok === true))
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      <button
        onClick={onMenuToggle}
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
        aria-label="Toggle menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coolify MCP</span>
      </div>

      <div className="flex-1 max-w-xl mx-4 hidden sm:block">
        <SearchBar />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected === true
                ? "bg-green-400"
                : connected === false
                ? "bg-red-400"
                : "bg-gray-500"
            }`}
          />
          <span className="text-xs text-gray-500 hidden md:inline">
            {connected === true ? "Connected" : connected === false ? "Disconnected" : "Checking..."}
          </span>
        </div>
        <ThemeToggle />
        <kbd className="hidden md:inline rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          ⌘K
        </kbd>
      </div>
    </header>
  );
}

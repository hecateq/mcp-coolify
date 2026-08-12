import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: "overview", label: "Go to Overview", action: () => navigate("/"), category: "Navigation" },
    { id: "projects", label: "Go to Projects", action: () => navigate("/projects"), category: "Navigation" },
    { id: "resources", label: "Go to Resources", action: () => navigate("/resources"), category: "Navigation" },
    { id: "deployments", label: "View Deployments", action: () => navigate("/deployments"), category: "Navigation" },
    { id: "deployments-failed", label: "View Failed Deployments", action: () => navigate("/deployments?status=failed"), category: "Navigation" },
    { id: "scheduled-tasks", label: "Go to Scheduled Tasks", action: () => navigate("/scheduled-tasks"), category: "Navigation" },
    { id: "backups", label: "Go to Backups", action: () => navigate("/backups"), category: "Navigation" },
    { id: "servers", label: "Go to Servers", action: () => navigate("/servers"), category: "Navigation" },
    { id: "tools", label: "Go to MCP Tools", action: () => navigate("/tools"), category: "Navigation" },
    { id: "audit", label: "Go to Audit Log", action: () => navigate("/audit"), category: "Navigation" },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    },
    []
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDownEvent(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center border-b border-gray-700 px-4">
          <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownEvent}
            className="flex-1 bg-transparent px-3 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
          />
          <kbd className="rounded border border-gray-600 px-1.5 py-0.5 text-xs text-gray-500">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No commands found</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action();
                setOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                i === selectedIndex ? "bg-blue-500/10 text-blue-400" : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="ml-auto rounded border border-gray-600 px-1.5 py-0.5 text-xs text-gray-500">
                  {cmd.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

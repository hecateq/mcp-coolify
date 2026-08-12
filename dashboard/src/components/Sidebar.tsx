import { NavLink } from "react-router-dom";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [{ to: "/", label: "Overview", icon: "◉" }],
  },
  {
    title: "Resources",
    items: [
      { to: "/projects", label: "Projects", icon: "▸" },
      { to: "/resources?type=application", label: "Applications", icon: "▸" },
      { to: "/resources?type=service", label: "Services", icon: "▸" },
      { to: "/resources?type=database", label: "Databases", icon: "▸" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/deployments", label: "Deployments", icon: "▸" },
      { to: "/scheduled-tasks", label: "Scheduled Tasks", icon: "▸" },
      { to: "/backups", label: "Backups", icon: "▸" },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { to: "/servers", label: "Servers", icon: "▸" },
    ],
  },
  {
    title: "MCP",
    items: [
      { to: "/tools", label: "Tools", icon: "▸" },
      { to: "/audit", label: "Audit Log", icon: "▸" },
    ],
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-gray-50 transition-transform duration-200 dark:border-gray-800 dark:bg-gray-900 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coolify MCP</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navSections.map((section) => (
            <div key={section.title || "root"}>
              {section.title && (
                <div className="mb-1 mt-4 px-3 text-xs font-semibold uppercase text-gray-500">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    }`
                  }
                >
                  <span className="text-xs">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

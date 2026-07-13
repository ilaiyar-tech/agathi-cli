import { NavLink } from "react-router-dom";
import { 
  MdDashboard, 
  MdChat, 
  MdBuild, 
  MdLanguage,
  MdDns, 
  MdTerminal, 
  MdBackup, 
  MdHistory, 
  MdPeople, 
  MdExtension, 
  MdAdminPanelSettings, 
  MdAnalytics, 
  MdLeaderboard, 
  MdQueue, 
  MdWork, 
  MdAssignment, 
  MdAccountTree, 
  MdSmartToy, 
  MdFolderOpen, 
  MdAutoStories, 
  MdMemory, 
  MdSettings 
} from "react-icons/md";

const items: [string, string, any][] = [
  ["/", "Dashboard", MdDashboard],
  ["/chat", "Chat", MdChat],
  ["/builder", "AI Builder", MdBuild],
  ["/browser", "Browser Engine", MdLanguage],
  ["/models", "Models", MdDns],
  ["/terminal", "Terminal", MdTerminal],
  ["/backups", "Backups", MdBackup],
  ["/audit", "Audit Logs", MdHistory],
  ["/users", "Users", MdPeople],
  ["/plugins", "Plugins", MdExtension],
  ["/admin", "Admin Controls", MdAdminPanelSettings],
  ["/analytics", "Analytics", MdAnalytics],
  ["/metrics", "System Metrics", MdLeaderboard],
  ["/queue", "Job Queue", MdQueue],
  ["/jobs", "Background Jobs", MdWork],
  ["/tasks", "Engine Tasks", MdAssignment],
  ["/workflows", "Workflows", MdAccountTree],
  ["/agents", "Active Agents", MdSmartToy],
  ["/files", "Project Files", MdFolderOpen],
  ["/knowledge", "Knowledge Base", MdAutoStories],
  ["/memory", "Long-term Memory", MdMemory],
  ["/settings", "Settings", MdSettings]
];

export function sidebar() {
  return (
    <div className="flex h-full w-[260px] flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="border-b border-white/5 p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white text-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            A
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">
              Agathi CLI
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Enterprise Control Center
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-4 custom-scrollbar">
        {items.map(([path, name, Icon]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-r from-purple-900/40 to-cyan-950/20 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="text-lg shrink-0 opacity-80" />
            <span className="truncate">{name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4 flex items-center justify-between text-xs text-gray-500">
        <span>v1.0.0 (Local-First)</span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    </div>
  );
}

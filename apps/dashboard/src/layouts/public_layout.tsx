import { Link, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSession } from "../services/api";
import { FaGithub } from "react-icons/fa";

export function public_layout() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("tu2pu_session_token");
    if (token) {
      getSession()
        .then((res: any) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem("tu2pu_session_token");
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tu2pu_session_token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#030407] text-white flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200 relative">
      {/* Futuristic Dot-Matrix Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at top, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at top, black 50%, transparent 100%)"
        }}
      />

      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#030407]/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-cyan-500 flex items-center justify-center font-black text-white text-lg shadow-[0_0_20px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-all duration-300">
              T
            </div>
            <span className="text-2xl font-black tracking-tight text-white">tu2pu</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-gray-400">
            <Link to="/docs" className="hover:text-white transition-colors duration-200">Documentation</Link>
            <Link to="/api" className="hover:text-white transition-colors duration-200">API Explorer</Link>
            <Link to="/status" className="hover:text-white transition-colors duration-200">System Status</Link>
            <Link to="/report" className="hover:text-white transition-colors duration-200">Report Issue</Link>
          </nav>

          <div className="flex items-center gap-5">
            {/* GitHub Star Button */}
            <a
              href="https://github.com/ilaiyar-tech/agathi-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white/[0.03] border border-white/10 px-4.5 py-2 text-xs font-bold hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200"
            >
              <FaGithub className="text-sm" />
              <span>Star on GitHub</span>
            </a>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold hover:bg-white/10 transition-colors duration-200"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 z-10">
        <Outlet />
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-white/[0.05] bg-black/40 py-16 text-sm text-gray-500 z-10">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-black text-white text-xs">
              T
            </div>
            <span className="font-semibold text-gray-400">© 2026 Ilaiyar. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link to="/api" className="hover:text-white transition-colors">API</Link>
            <Link to="/status" className="hover:text-white transition-colors">Status</Link>
            <Link to="/report" className="hover:text-white transition-colors">Report Bug</Link>
          </div>

          <div>
            <span className="text-xs text-gray-600 font-medium">
              Created with ❤️ by <span className="font-bold text-gray-400">Ilaiyar Solutions</span> for LLMs.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

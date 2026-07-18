import { Link, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSession } from "../services/api";

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
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-white flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white text-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform duration-200">
              T
            </div>
            <span className="text-xl font-bold tracking-tight text-white">tu2pu</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link to="/api" className="hover:text-white transition-colors">API Explorer</Link>
            <Link to="/status" className="hover:text-white transition-colors">System Status</Link>
            <Link to="/report" className="hover:text-white transition-colors">Report Issue</Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-white/5 bg-black/60 py-12 text-sm text-gray-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs">
              T
            </div>
            <span>© 2026 Ilaiyar. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <Link to="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link to="/api" className="hover:text-white transition-colors">API</Link>
            <Link to="/status" className="hover:text-white transition-colors">Status</Link>
            <Link to="/report" className="hover:text-white transition-colors">Report Bug</Link>
          </div>

          <div>
            <span className="text-xs text-gray-600">
              Created with ❤️ by <span className="font-semibold text-gray-400">Ilaiyar Solutions</span> for LLMs.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api";

export function login_page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login({ email, password });
      localStorage.setItem("tu2pu_session_token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#030407] px-8 py-24 relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-lg rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-10 md:p-12 shadow-2xl relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        
        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-3 text-center">Welcome Back</h2>
        <p className="text-gray-400 text-base text-center mb-10 font-medium">
          Sign in to your tu2pu developer account.
        </p>

        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@tu2pu.in"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base text-white focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
              <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300 font-bold tracking-wide">Forgot Password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base text-white focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-white text-black py-4 text-base font-bold hover:bg-gray-200 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 mt-8"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500 font-medium">
          Don't have an account? <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-bold">Sign up</Link>
        </p>

        <div className="mt-8 border-t border-white/[0.06] pt-8 text-center text-xs text-gray-500 font-medium">
          Tip: Use <code className="text-purple-400 font-bold">local@tu2pu</code> and password <code className="text-purple-400 font-bold">local</code> for offline operator access.
        </div>
      </div>
    </div>
  );
}

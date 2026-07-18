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
      navigate("/dashboard");
      window.location.reload(); // Refresh header user state
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#05070c] px-6 py-20 relative">
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl relative">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Sign in to your tu2pu developer account.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@tu2pu.in"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Password</label>
              <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300 font-medium">Forgot Password?</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-3 text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-500">
          Don't have an account? <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-medium">Sign up</Link>
        </p>

        <div className="mt-6 border-t border-white/5 pt-6 text-center text-[10px] text-gray-600">
          Tip: Use <code className="text-purple-400">local@tu2pu</code> and password <code className="text-purple-400">local</code> for offline operator access.
        </div>
      </div>
    </div>
  );
}

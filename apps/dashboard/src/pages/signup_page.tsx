import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/api";

export function signup_page() {
  const [name, setName] = useState("");
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
      const res = await signup({ name, email, password });
      localStorage.setItem("tu2pu_session_token", res.data.token);
      navigate("/dashboard");
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
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

        <h2 className="text-4xl font-extrabold tracking-tight text-white mb-3 text-center">Create Developer Account</h2>
        <p className="text-gray-400 text-base text-center mb-10 font-medium">
          Get started with the tu2pu open-source platform.
        </p>

        {error && (
          <div className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elon Musk"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base text-white focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev@ilaiyar.in"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base text-white focus:border-purple-500/50 focus:bg-white/[0.05] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Password</label>
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
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500 font-medium">
          Already have an account? <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold">Log in</Link>
        </p>
      </div>
    </div>
  );
}

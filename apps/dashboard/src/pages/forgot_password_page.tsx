import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";

export function forgot_password_page() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await forgotPassword({ email });
      setMessage(res.data.message || "Password recovery process initiated.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to process recovery request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-4rem)] bg-[#05070c] px-6 py-20 relative">
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-black/40 backdrop-blur-2xl p-8 shadow-2xl relative">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">Reset Password</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Enter your email to receive recovery instructions.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400">
            ⚠ {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-400">
            ✔ {message}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-3 text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-500">
          Remember your password? <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  );
}

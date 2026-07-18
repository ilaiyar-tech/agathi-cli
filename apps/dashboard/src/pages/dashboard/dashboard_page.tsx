import { useState, useEffect } from "react";
import { live_logs } from "../../components/logs/live_logs";
import { gpu_chart } from "../../components/charts/gpu_chart";
import { live_status } from "../../components/dashboard/live_status";
import { system_cards } from "../../components/system/system_cards";
import { ErrorBoundary } from "../../components/error_boundary";
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getReleases,
  getChats,
  models as getModels,
  activeModel as getActiveModel,
  activeProvider as getActiveProvider,
  getSession,
  updateProfile,
  deleteAccount
} from "../../services/api";

export function dashboard_page() {
  const [activeTab, setActiveTab] = useState("overview");
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [releases, setReleases] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [activeMod, setActiveMod] = useState("");
  const [activeProv, setActiveProv] = useState("");

  // User Profile state
  const [profile, setProfile] = useState<any>({ name: "Local operator", email: "local@tu2pu" });
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");

  useEffect(() => {
    // Fetch dashboard overview datasets
    getApiKeys().then((res: any) => setApiKeys(res.data.keys || [])).catch(console.error);
    getReleases().then((res: any) => setReleases(res.data.releases || [])).catch(console.error);
    getChats().then((res: any) => setRecentChats(res.data || [])).catch(console.error);
    getModels().then((res: any) => setModelsList(res.data || [])).catch(console.error);
    getActiveModel().then((res: any) => setActiveMod(res.data.active || "None")).catch(console.error);
    getActiveProvider().then((res: any) => setActiveProv(res.data.active || "None")).catch(console.error);

    // Load active profile
    getSession()
      .then((res: any) => {
        setProfile(res.data.user);
        setEditName(res.data.user.name);
        setEditEmail(res.data.user.email);
      })
      .catch(console.error);
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await createApiKey({ name: newKeyName });
      setGeneratedKey(res.data.key);
      setNewKeyName("");
      // Refresh keys
      const keysRes = await getApiKeys();
      setApiKeys(keysRes.data.keys || []);
    } catch (err) {
      console.error("Failed to generate API Key:", err);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm("Are you sure you want to revoke this API Key?")) return;
    try {
      await deleteApiKey(key);
      const keysRes = await getApiKeys();
      setApiKeys(keysRes.data.keys || []);
    } catch (err) {
      console.error("Failed to revoke API Key:", err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    try {
      const payload: any = { name: editName, email: editEmail };
      if (editPassword) payload.password = editPassword;
      const res = await updateProfile(payload);
      setProfile(res.data.user);
      setProfileMsg("Profile updated successfully!");
      setEditPassword("");
    } catch (err) {
      setProfileMsg("Failed to update profile settings.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("CRITICAL: Are you sure you want to delete your developer account? This action is permanent.")) return;
    try {
      await deleteAccount();
      localStorage.removeItem("tu2pu_session_token");
      window.location.href = "/";
    } catch (err) {
      alert("Failed to delete account.");
    }
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      {/* Dashboard Subheader Navigation Tabs */}
      <div className="flex border-b border-white/5 bg-black/20 p-2 rounded-xl text-sm gap-2">
        {[
          { id: "overview", label: "System Overview" },
          { id: "apikeys", label: "API Key Management" },
          { id: "downloads", label: "Downloads & Releases" },
          { id: "account", label: "Developer Profile" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setGeneratedKey("");
              setProfileMsg("");
            }}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-purple-900/40 to-cyan-950/20 border border-purple-500/30 text-white shadow-lg"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <ErrorBoundary>
            {live_status()}
          </ErrorBoundary>

          <ErrorBoundary>
            {system_cards()}
          </ErrorBoundary>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Quick overview side info */}
            <div className="p-6 rounded-xl border border-white/5 bg-black/40 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white mb-4">Active Routing Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Active Model</span>
                    <span className="text-sm font-semibold text-purple-400 truncate block">{activeMod}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Active Provider</span>
                    <span className="text-sm font-semibold text-cyan-400 truncate block">{activeProv}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-3">Recent Interactive Chats</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {recentChats.slice(0, 5).map((chat) => (
                    <div key={chat.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300">
                      <span className="font-medium truncate max-w-[180px]">{chat.name}</span>
                      <span className="text-gray-500 font-mono">{chat.messages?.length || 0} msgs</span>
                    </div>
                  ))}
                  {recentChats.length === 0 && <span className="text-xs text-gray-500 block text-center py-4">No recent chats.</span>}
                </div>
              </div>
            </div>

            <div className="xl:col-span-2 grid gap-6 md:grid-cols-2">
              <ErrorBoundary>
                {gpu_chart()}
              </ErrorBoundary>
              <ErrorBoundary>
                {live_logs()}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {activeTab === "apikeys" && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-8 rounded-xl border border-white/5 bg-black/40 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Developer API Credentials</h3>
              <p className="text-sm text-gray-400">Generate and rotate secure Bearer tokens to connect codebases, IDE plugins, or external CLI workflows.</p>
            </div>

            {generatedKey && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <span className="text-xs font-bold text-purple-300 block">API Key Generated successfully! Copy it now; you won't be able to see it again.</span>
                <pre className="p-3 bg-black/60 rounded border border-white/10 font-mono text-sm text-white select-all break-all">{generatedKey}</pre>
              </div>
            )}

            <div className="space-y-4">
              {apiKeys.map((k) => (
                <div key={k.key} className="flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/5">
                  <div>
                    <span className="text-sm font-semibold text-white block">{k.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono block">Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">{k.status}</span>
                    <button
                      onClick={() => handleDeleteKey(k.key)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && <span className="text-sm text-gray-500 block text-center py-8">No API keys created.</span>}
            </div>
          </div>

          <div className="p-8 rounded-xl border border-white/5 bg-black/40 space-y-6 self-start">
            <h3 className="text-lg font-bold text-white">Generate API Key</h3>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Key Label / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aider Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-white text-black py-2.5 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Generate Token Key
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "downloads" && (
        <div className="p-8 rounded-xl border border-white/5 bg-black/40 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Release Assets & Downloads History</h3>
            <p className="text-sm text-gray-400">Download binary bundles of the stable CLI tool directly.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {releases.map((rel: any, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-white mb-1">{rel.platform} Package</h4>
                  <span className="text-xs font-mono text-gray-500 break-all block mb-4">SHA256: {rel.checksum}</span>
                  <p className="text-xs text-gray-400 mb-6">{rel.notes}</p>
                </div>
                <a
                  href={`/${rel.filename}`}
                  download={rel.filename}
                  className="rounded-lg bg-white/5 border border-white/10 text-white font-semibold py-2 hover:bg-white/10 text-xs transition-colors text-center block"
                >
                  Download v{rel.version} Bin
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-8 rounded-xl border border-white/5 bg-black/40 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Account Profile & Security</h3>
              <p className="text-sm text-gray-400">Manage display name, credentials, and authentication sessions.</p>
            </div>

            {profileMsg && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Change Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-white text-black px-6 py-2.5 text-xs font-semibold hover:bg-gray-200 transition-colors"
              >
                Save Settings
              </button>
            </form>
          </div>

          <div className="p-8 rounded-xl border border-red-500/10 bg-red-500/5 space-y-4 self-start">
            <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
            <p className="text-xs text-red-500/80 leading-relaxed">Deleting your account is permanent. This deletes your credentials and all active console session keys.</p>
            <button
              onClick={handleDeleteAccount}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 text-xs font-semibold transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

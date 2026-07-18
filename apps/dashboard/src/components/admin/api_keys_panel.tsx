import { useState, useEffect } from "react";
import { getApiKeys, createApiKey, deleteApiKey } from "../../services/api";
import { MdDelete, MdContentCopy, MdCheck } from "react-icons/md";

export function api_keys_panel() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshKeys();
  }, []);

  async function refreshKeys() {
    try {
      const res = await getApiKeys();
      setKeys(res.data.keys || []);
    } catch (e) {
      console.error("Failed to load API keys", e);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createApiKey({ name });
      setGeneratedKey(res.data.key);
      setName("");
      await refreshKeys();
    } catch (e) {
      console.error("Failed to generate API key", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(key: string) {
    if (confirm("Are you sure you want to revoke this API key? Cloud users using it will immediately lose access.")) {
      try {
        await deleteApiKey(key);
        if (generatedKey === key) {
          setGeneratedKey(null);
        }
        await refreshKeys();
      } catch (e) {
        console.error("Failed to delete API key", e);
      }
    }
  }

  function handleCopy() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Cloud API Keys</h2>
        <p className="text-sm text-gray-400 mt-1">Generate and manage authorization credentials for remote cloud users.</p>
      </div>

      {generatedKey && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
          <div className="text-sm font-semibold text-emerald-300">New API Key Generated Successfully!</div>
          <div className="text-xs text-emerald-400">Copy this key now. For security reasons, you won't be able to see it again.</div>
          <div className="flex gap-2 items-center bg-black/40 rounded-xl p-3 border border-emerald-500/20">
            <code className="flex-1 break-all text-sm font-mono text-emerald-200">{generatedKey}</code>
            <button 
              onClick={handleCopy}
              className="p-2 rounded-lg bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50 transition"
              title="Copy to Clipboard"
            >
              {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <input 
          placeholder="Client Name (e.g. Aider Cloud, Team Server)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition"
          disabled={loading}
        />
        <button 
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-violet-500 transition"
        >
          {loading ? "Generating..." : "Generate Key"}
        </button>
      </div>

      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-white/5 rounded-2xl">
            No API keys generated yet. Add one above to secure your completions endpoint.
          </div>
        ) : (
          keys.map((k: any) => (
            <div key={k.key} className="flex justify-between items-center rounded-2xl border border-white/5 bg-black/20 p-4">
              <div>
                <div className="font-semibold text-white">{k.name}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-2">
                  <span>Created: {new Date(k.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>{k.key.substring(0, 15)}...</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {k.status}
                </span>
                <button 
                  onClick={() => handleDelete(k.key)}
                  className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                  title="Revoke Key"
                >
                  <MdDelete size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

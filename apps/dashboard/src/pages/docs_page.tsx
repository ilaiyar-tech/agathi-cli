import { useState, useEffect } from "react";
import { getDoc } from "../services/api";

const DOCS_LIST = [
  { id: "INSTALL_AND_UPGRADE", name: "Installation & Upgrade", category: "Getting Started" },
  { id: "PLATFORM_IDENTITY", name: "Platform Identity", category: "Specifications" },
  { id: "ARCHITECTURE", name: "Platform Architecture", category: "Specifications" },
  { id: "ENGINEERING_RULES", name: "Engineering Rules", category: "Guidelines" },
  { id: "RELEASE_NOTES_v1.0.0", name: "Release Notes v1.0.0", category: "Releases" },
  { id: "CHANGELOG", name: "Changelog", category: "Releases" }
];

export function docs_page() {
  const [selectedDoc, setSelectedDoc] = useState(DOCS_LIST[0].id);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDoc(selectedDoc)
      .then((res: any) => {
        setContent(res.data.content || "");
      })
      .catch((err) => {
        console.error(err);
        setContent("Failed to load document.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedDoc]);

  // A premium simple custom markdown parser to convert MD to styled HTML safely
  const parseMarkdown = (md: string) => {
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xl font-bold text-white mt-8 mb-3">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-3xl font-extrabold text-white mt-12 mb-5 border-b border-white/[0.06] pb-3">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-purple-400 mt-2 mb-8 leading-tight">$1</h2>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-black/50 border border-white/[0.06] p-6 rounded-2xl font-mono text-sm text-purple-300 overflow-x-auto my-6 leading-relaxed shadow-[inset_0_1px_10px_rgba(0,0,0,0.4)]">$1</pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-lg font-mono text-xs text-purple-300">$1</code>');

    // Bold/Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-300">$1</em>');

    // Links (markdown format [text](url))
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-purple-400 hover:text-purple-300 hover:underline font-bold transition-colors">$1</a>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li class="list-disc list-inside text-gray-300 ml-5 my-2 leading-relaxed">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-gray-300 ml-5 my-2 leading-relaxed">$1</li>');

    // Table mapping
    html = html.replace(/\| (.*) \|/g, (match, content) => {
      const cols = content.split(" | ").map((c: string) => `<td class="p-4 border border-white/[0.06] text-sm text-gray-300">${c}</td>`).join("");
      return `<tr class="border-b border-white/[0.06] hover:bg-white/[0.01] transition-colors">${cols}</tr>`;
    });

    return html.split("\n").map(line => {
      if (line.trim().startsWith("<li") || line.trim().startsWith("<h") || line.trim().startsWith("<pre") || line.trim().startsWith("<tr") || line.trim().startsWith("<td")) {
        return line;
      }
      return line.trim() ? `<p class="text-gray-300 leading-loose text-base my-4">${line}</p>` : "";
    }).join("");
  };

  const docIndex = DOCS_LIST.findIndex(d => d.id === selectedDoc);
  const prevDoc = docIndex > 0 ? DOCS_LIST[docIndex - 1] : null;
  const nextDoc = docIndex < DOCS_LIST.length - 1 ? DOCS_LIST[docIndex + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-8 py-16 flex flex-col lg:flex-row gap-12 min-h-[calc(100vh-10rem)]">
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-8">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Version</label>
          <select className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50">
            <option>v1.0.0 (Latest)</option>
          </select>
        </div>

        <nav className="flex flex-col gap-8">
          {["Getting Started", "Specifications", "Guidelines", "Releases"].map((cat) => {
            const items = DOCS_LIST.filter(d => d.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 mb-1">{cat}</span>
                {items.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.id)}
                    className={`text-left text-sm font-semibold rounded-xl px-4 py-3 transition-all duration-200 ${
                      selectedDoc === doc.id
                        ? "bg-purple-950/20 border border-purple-500/30 text-white shadow-sm"
                        : "text-gray-400 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    {doc.name}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Document Content Panel */}
      <article className="flex-1 w-full border border-white/[0.06] rounded-3xl bg-[#080b11]/30 p-10 md:p-14 shadow-2xl flex flex-col justify-between">
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-purple-400 font-semibold gap-4">
              <span className="animate-spin text-3xl">⏳</span>
              <span className="text-sm font-medium">Retrieving specification...</span>
            </div>
          ) : (
            <div
              className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          )}
        </div>

        {/* Previous / Next buttons */}
        <div className="border-t border-white/[0.06] mt-16 pt-10 flex justify-between items-center gap-6">
          {prevDoc ? (
            <button
              onClick={() => setSelectedDoc(prevDoc.id)}
              className="flex flex-col items-start gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Previous</span>
              <span className="text-sm font-bold text-white">{prevDoc.name}</span>
            </button>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <button
              onClick={() => setSelectedDoc(nextDoc.id)}
              className="flex flex-col items-end gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4 hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.98] transition-all text-right"
            >
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Next</span>
              <span className="text-sm font-bold text-white">{nextDoc.name}</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      </article>
    </div>
  );
}

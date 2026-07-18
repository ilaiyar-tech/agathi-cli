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
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-lg font-bold text-white mt-6 mb-2">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/5 pb-2">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 mt-2 mb-6">$1</h2>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/gm, '<pre class="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-sm text-purple-300 overflow-x-auto my-4">$1</pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-purple-300">$1</code>');

    // Bold/Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-300">$1</em>');

    // Links (markdown format [text](url))
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-purple-400 hover:underline font-semibold">$1</a>');

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li class="list-disc list-inside text-gray-400 ml-4 my-1">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-gray-400 ml-4 my-1">$1</li>');

    // Table mapping
    html = html.replace(/\| (.*) \|/g, (match, content) => {
      const cols = content.split(" | ").map((c: string) => `<td class="p-3 border border-white/5">${c}</td>`).join("");
      return `<tr class="border-b border-white/5 hover:bg-white/5">${cols}</tr>`;
    });

    return html.split("\n").map(line => {
      if (line.trim().startsWith("<li") || line.trim().startsWith("<h") || line.trim().startsWith("<pre") || line.trim().startsWith("<tr") || line.trim().startsWith("<td")) {
        return line;
      }
      return line.trim() ? `<p class="text-gray-400 leading-relaxed my-3">${line}</p>` : "";
    }).join("");
  };

  const docIndex = DOCS_LIST.findIndex(d => d.id === selectedDoc);
  const prevDoc = docIndex > 0 ? DOCS_LIST[docIndex - 1] : null;
  const nextDoc = docIndex < DOCS_LIST.length - 1 ? DOCS_LIST[docIndex + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row gap-10 min-h-[calc(100vh-10rem)]">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Version</label>
          <select className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none">
            <option>v1.0.0 (Latest)</option>
          </select>
        </div>

        <nav className="flex flex-col gap-6">
          {["Getting Started", "Specifications", "Guidelines", "Releases"].map((cat) => {
            const items = DOCS_LIST.filter(d => d.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3">{cat}</span>
                {items.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.id)}
                    className={`text-left text-sm font-semibold rounded-lg px-3 py-2 transition-all ${
                      selectedDoc === doc.id
                        ? "bg-purple-950/20 border border-purple-500/20 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
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
      <article className="flex-1 w-full max-w-4xl border border-white/5 rounded-2xl bg-black/20 p-8 md:p-12 shadow-xl flex flex-col justify-between">
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-purple-400 font-semibold gap-3">
              <span className="animate-spin text-2xl">⏳</span>
              <span>Loading document...</span>
            </div>
          ) : (
            <div
              className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-400"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          )}
        </div>

        {/* Previous / Next buttons */}
        <div className="border-t border-white/5 mt-12 pt-8 flex justify-between items-center gap-4">
          {prevDoc ? (
            <button
              onClick={() => setSelectedDoc(prevDoc.id)}
              className="flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-white/5 px-5 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-xs text-gray-500">Previous</span>
              <span className="text-sm font-semibold text-white">{prevDoc.name}</span>
            </button>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <button
              onClick={() => setSelectedDoc(nextDoc.id)}
              className="flex flex-col items-end gap-1 rounded-xl border border-white/5 bg-white/5 px-5 py-3 hover:bg-white/10 transition-colors text-right"
            >
              <span className="text-xs text-gray-500">Next</span>
              <span className="text-sm font-semibold text-white">{nextDoc.name}</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      </article>
    </div>
  );
}

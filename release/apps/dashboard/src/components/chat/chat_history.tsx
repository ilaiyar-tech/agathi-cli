import { useEffect, useState } from "react";
import { use_chat_store } from "../../stores/chat_store";
import { MdSearch, MdEdit, MdDelete, MdCheck, MdClose } from "react-icons/md";

export function chat_history(){

const { sessions, activeSessionId, setActiveSession, loadSessions, createSession, deleteSession, renameSession } = use_chat_store();

const [search, setSearch] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [editName, setEditName] = useState("");

useEffect(() => {
  loadSessions();
}, [loadSessions]);

const filteredSessions = sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

const handleRename = async (id: string) => {
  if (editName.trim()) {
    await renameSession(id, editName);
  }
  setEditingId(null);
};

const handleExport = (session: any) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", session.name + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

const sortedSessions = [...filteredSessions].sort((a, b) => {
  const aPinned = use_chat_store.getState().pinnedSessionIds.includes(a.id);
  const bPinned = use_chat_store.getState().pinnedSessionIds.includes(b.id);
  if (aPinned && !bPinned) return -1;
  if (!aPinned && bPinned) return 1;
  return 0;
});

return(

<div className="rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl h-full flex flex-col">

<div className="border-b border-white/5 p-5 font-semibold flex justify-between items-center">
  <span>Chats</span>
  <button 
    onClick={() => createSession()}
    className="text-xs bg-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-500 transition"
  >
    New
  </button>
</div>

<div className="p-4 border-b border-white/5">
  <div className="relative">
    <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
    <input 
      type="text"
      placeholder="Search..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-violet-500 transition"
    />
  </div>
</div>

<div className="p-3 flex-1 overflow-y-auto">

{sortedSessions.map(session=>{
  const isPinned = use_chat_store.getState().pinnedSessionIds.includes(session.id);
  return (
<div
key={session.id}
className={`group mb-2 w-full rounded-xl border flex items-center justify-between p-3 transition ${
  activeSessionId === session.id 
    ? "border-violet-500 bg-white/5" 
    : "border-white/5 bg-black/20 hover:border-violet-500/50"
}`}
>

  {editingId === session.id ? (
    <div className="flex items-center gap-2 w-full">
      <input 
        autoFocus
        value={editName}
        onChange={e => setEditName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleRename(session.id);
          if (e.key === 'Escape') setEditingId(null);
        }}
        className="bg-black/50 border border-white/10 rounded px-2 py-1 flex-1 text-sm outline-none"
      />
      <button onClick={() => handleRename(session.id)} className="text-green-400 hover:text-green-300">
        <MdCheck />
      </button>
      <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
        <MdClose />
      </button>
    </div>
  ) : (
    <>
      <button
        onClick={() => setActiveSession(session.id)}
        className="flex-1 text-left truncate pr-2 text-sm flex items-center gap-2"
      >
        {isPinned && <span className="text-violet-400 text-xs">★</span>}
        {session.name}
      </button>
      <div className="hidden group-hover:flex items-center gap-2">
        <button 
          onClick={() => use_chat_store.getState().togglePinSession(session.id)}
          className="text-gray-400 hover:text-yellow-400 transition"
          title={isPinned ? "Unpin" : "Pin"}
        >
          <span className="text-xs">★</span>
        </button>
        <button 
          onClick={() => handleExport(session)}
          className="text-gray-400 hover:text-blue-400 transition"
          title="Export"
        >
          <span className="text-xs">⬇</span>
        </button>
        <button 
          onClick={() => {
            setEditName(session.name);
            setEditingId(session.id);
          }}
          className="text-gray-400 hover:text-white transition"
          title="Rename"
        >
          <MdEdit size={14} />
        </button>
        <button 
          onClick={() => deleteSession(session.id)}
          className="text-gray-400 hover:text-red-400 transition"
          title="Delete"
        >
          <MdDelete size={14} />
        </button>
      </div>
    </>
  )}

</div>
)})}

</div>

</div>

);

}

import { useState, useRef, useEffect } from "react";
import { use_chat_store } from "../../stores/chat_store";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MdContentCopy, MdStop, MdRefresh, MdImage, MdAttachFile, MdClose } from "react-icons/md";

export function chat_panel(){

const [prompt,setPrompt]=useState("");
const [files, setFiles] = useState<File[]>([]);
const [isDragging, setIsDragging] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

const{
messages,
busy,
send,
createSession,
stopGeneration
}=use_chat_store();

const bottomRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages, busy]);

async function submit(){
  if(!prompt.trim() && files.length === 0) return;
  const text=prompt;
  setPrompt("");
  setFiles([]);
  await send(text); // TODO: pass files if backend supported
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files.length > 0) {
    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  }
};

const removeFile = (index: number) => {
  setFiles(prev => prev.filter((_, i) => i !== index));
};

return(

<div 
  className={`flex h-full flex-col rounded-3xl border ${isDragging ? 'border-violet-500' : 'border-white/5'} bg-white/[0.03] transition-colors duration-200`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>

<div className="border-b border-white/5 p-5 text-xl font-semibold flex justify-between items-center">
  <span>Agathi Chat</span>
  <div className="flex gap-2">
    <button onClick={() => createSession()} className="text-sm rounded-lg border border-white/5 px-3 py-1 hover:bg-white/5 transition">
      New Chat
    </button>
  </div>
</div>

<div className="flex-1 overflow-auto p-6 space-y-6">

{messages.map((message,index)=>(

<div

key={index}

className={
message.role==="user"
?"ml-auto max-w-[80%] rounded-3xl bg-violet-600 p-5"
:"mr-auto max-w-[80%] rounded-3xl border border-white/5 bg-black/30 p-5"
}

>

<div className="mb-2 text-xs uppercase tracking-widest text-gray-400 flex justify-between">
  <span>{message.role}</span>
</div>

<div className="prose prose-invert max-w-none">
  <Markdown
    components={{
      code(props) {
        const {children, className, node, ref, ...rest} = props;
        const match = /language-(\w+)/.exec(className || "");
        const codeContent = String(children).replace(/\n$/, "");
        return match ? (
          <div className="relative group rounded-md overflow-hidden my-4">
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button 
                onClick={() => copyToClipboard(codeContent)}
                className="bg-black/50 p-1.5 rounded hover:bg-black/70 text-white"
                title="Copy Code"
              >
                <MdContentCopy size={14} />
              </button>
            </div>
            <SyntaxHighlighter
              {...(rest as any)}
              children={codeContent}
              language={match[1]}
              style={vscDarkPlus}
              customStyle={{ margin: 0, borderRadius: '0.375rem' }}
            />
          </div>
        ) : (
          <code {...rest} className="bg-black/30 px-1 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        );
      }
    }}
  >
    {message.content}
  </Markdown>
</div>

</div>

))}

{busy&&(

<div className="mr-auto rounded-3xl border border-white/5 bg-black/30 p-5 flex items-center gap-3">
  <div className="animate-pulse">Thinking...</div>
  <button 
    onClick={stopGeneration}
    className="ml-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 p-1 rounded transition flex items-center text-sm"
  >
    <MdStop /> Stop
  </button>
</div>

)}

<div ref={bottomRef} />

</div>

<div className="border-t border-white/5 p-5">
  {files.length > 0 && (
    <div className="mb-4 flex flex-wrap gap-3">
      {files.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        return (
          <div key={index} className="relative group rounded-xl border border-white/10 bg-black/30 p-2 pr-8 flex items-center gap-2 max-w-xs">
            {isImage ? (
              <img src={URL.createObjectURL(file)} alt={file.name} className="h-10 w-10 object-cover rounded-lg" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                <MdAttachFile size={20} />
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-sm text-white truncate">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button 
              onClick={() => removeFile(index)} 
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity bg-black/50 rounded-full"
            >
              <MdClose size={16} />
            </button>
          </div>
        );
      })}
    </div>
  )}

  <div className="relative">
    <textarea
      value={prompt}
      onChange={e=>setPrompt(e.target.value)}
      onKeyDown={async e=>{
        if(e.key==="Enter"&&!e.shiftKey){
          e.preventDefault();
          await submit();
        }
      }}
      placeholder="Message Agathi AI..."
      className="h-36 w-full resize-none rounded-3xl border border-white/5 bg-black/20 p-5 pl-12 pr-5 outline-none"
    />
    
    <div className="absolute left-4 top-4 flex flex-col gap-3 text-gray-400">
      <button onClick={() => fileInputRef.current?.click()} className="hover:text-white transition" title="Upload File">
        <MdAttachFile size={20} />
      </button>
      <button onClick={() => fileInputRef.current?.click()} className="hover:text-white transition" title="Upload Image">
        <MdImage size={20} />
      </button>
      <input type="file" onChange={handleFileSelect} ref={fileInputRef} className="hidden" multiple />
    </div>
  </div>

  <div className="mt-5 flex justify-between items-center">
    <div className="text-xs text-gray-500 flex gap-4">
      {messages.length > 0 && (
        <button 
          onClick={() => send(messages[messages.length - 1].role === 'user' ? messages[messages.length - 1].content : messages[messages.length - 2].content, true)}
          disabled={busy}
          className="flex items-center gap-1 hover:text-white transition disabled:opacity-50"
        >
          <MdRefresh /> Regenerate
        </button>
      )}
    </div>
    <button
      onClick={submit}
      disabled={busy}
      className="rounded-2xl bg-violet-600 px-8 py-3 disabled:bg-zinc-700 hover:bg-violet-700 transition"
    >
      Send
    </button>
  </div>

</div>

</div>

);

}

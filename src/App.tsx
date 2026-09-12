import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  FileImage,
  ImagePlus,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings2,
  Sparkles,
  SquarePen,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateImage, getProviderHealth, sendChat, uploadFile } from "./api/client";
import type { Message, ProviderHealth, UploadResult } from "./types";

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Welcome back. I’m ready to think with you, inspect files, and turn rough ideas into working code.",
    createdAt: "09:41",
  },
  {
    id: "starter",
    role: "assistant",
    content: "What are we building today?",
    createdAt: "09:41",
  },
];

type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

const STORAGE_KEY = "agentic-ai-conversations";

function getStoredConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Conversation[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

function createConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Untitled workspace",
    updatedAt: "Now",
    messages: initialMessages,
  };
}

function getTimeLabel() {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date());
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getFileExtension(language: string) {
  const extensions: Record<string, string> = {
    python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts",
    jsx: "jsx", tsx: "tsx", json: "json", html: "html", css: "css", scss: "scss",
    sql: "sql", bash: "sh", shell: "sh", yaml: "yml", yml: "yml", markdown: "md", md: "md",
    java: "java", go: "go", rust: "rs", csharp: "cs", cpp: "cpp", c: "c",
  };
  return extensions[language.toLowerCase()] ?? "txt";
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadCode() {
    const url = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `solution.${getFileExtension(language)}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language || "code"}</span>
        <div className="code-actions">
          <button type="button" className="copy-code" onClick={copyCode} aria-label="Copy code">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button type="button" className="copy-code" onClick={downloadCode} aria-label="Download code file">
            <Download size={13} /><span>Download</span>
          </button>
        </div>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const language = /language-([\w-]+)/.exec(className ?? "")?.[1] ?? "";
            const code = String(children).replace(/\n$/, "");
            if (!className) return <code className="inline-code" {...props}>{children}</code>;
            return <CodeBlock language={language} code={code} />;
          },
          a: ({ children, ...props }) => <a target="_blank" rel="noreferrer" {...props}>{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = getStoredConversations();
    return stored.length > 0 ? stored : [createConversation()];
  });
  const [currentConversationId, setCurrentConversationId] = useState(() => conversations[0].id);
  const [messages, setMessages] = useState<Message[]>(() => conversations[0].messages);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [health, setHealth] = useState<ProviderHealth>({ status: "offline", model: "gemma4", models: [] });
  const [selectedModel, setSelectedModel] = useState(health.model);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachment, setAttachment] = useState<UploadResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const currentConversationRef = useRef(currentConversationId);

  useEffect(() => {
    getProviderHealth().then((provider) => {
      setHealth(provider);
      setSelectedModel(provider.model);
    }).catch(() => setHealth((current) => ({ ...current, status: "offline" })));
  }, []);

  useEffect(() => {
    currentConversationRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    setConversations((current) => current.map((conversation) => {
      if (conversation.id !== currentConversationId || conversation.messages === messages) return conversation;
      return { ...conversation, messages, updatedAt: getTimeLabel() };
    }));
  }, [currentConversationId, messages]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  function startNewConversation() {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setCurrentConversationId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setAttachment(null);
    setNotice(null);
    setIsSidebarOpen(false);
  }

  function selectConversation(conversation: Conversation) {
    setCurrentConversationId(conversation.id);
    setMessages(conversation.messages);
    setInput("");
    setAttachment(null);
    setNotice(null);
    setIsSidebarOpen(false);
  }

  function deleteConversation(conversationId: string) {
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
    const nextConversation = remaining[0] ?? createConversation();
    setConversations(remaining.length > 0 ? remaining : [nextConversation]);
    if (currentConversationId === conversationId) {
      setCurrentConversationId(nextConversation.id);
      setMessages(nextConversation.messages);
      setInput("");
      setAttachment(null);
      setNotice(null);
    }
  }

  function appendMessageToConversation(conversationId: string, message: Message) {
    setConversations((current) => current.map((conversation) => conversation.id === conversationId
      ? { ...conversation, messages: [...conversation.messages, message], updatedAt: getTimeLabel() }
      : conversation));
    if (currentConversationRef.current === conversationId) {
      setMessages((current) => [...current, message]);
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || isSending) return;
    const conversationId = currentConversationId;
    const userMessage: Message = {
      id: crypto.randomUUID(), role: "user", content: prompt, createdAt: "Now",
      attachment: attachment ? { name: attachment.filename, type: attachment.content_type, url: attachment.url } : undefined,
    };
    if (messages.length <= initialMessages.length) {
      setConversations((current) => current.map((conversation) => conversation.id === currentConversationId
        ? { ...conversation, title: prompt.slice(0, 36) + (prompt.length > 36 ? "..." : "") }
        : conversation));
    }
    appendMessageToConversation(conversationId, userMessage);
    setInput("");
    setIsSending(true);
    setNotice(null);
    try {
      if (mode === "image") {
        const result = await generateImage(prompt);
        const content = result.status === "completed" ? "Image generated from your prompt." : result.message ?? "Image generation is not configured yet.";
        appendMessageToConversation(conversationId, { id: crypto.randomUUID(), role: "assistant", content, createdAt: "Now", imageUrl: result.url });
      } else {
        const result = await sendChat([...messages, userMessage], selectedModel);
        appendMessageToConversation(conversationId, { id: crypto.randomUUID(), role: "assistant", content: result.content, createdAt: `${(result.durationMs / 1000).toFixed(1)}s` });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSending(false);
      setAttachment(null);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setAttachment(await uploadFile(file));
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed");
    }
    event.target.value = "";
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={17} strokeWidth={2.5} /></div>
          <span>agentic<span className="brand-dot">.</span></span>
          <button className="icon-button sidebar-close" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar"><X size={17} /></button>
        </div>
        <button className="new-chat" onClick={startNewConversation}><SquarePen size={16} /> New workspace <span>⌘ K</span></button>
        <div className="search-box"><Search size={15} /><input placeholder="Search conversations" /><span>⌘ F</span></div>
        <div className="conversation-label">Your conversations <button className="icon-button" aria-label="Add conversation"><Plus size={15} /></button></div>
        <nav className="conversation-list">
          {conversations.map((conversation) => {
            const active = conversation.id === currentConversationId;
            return <div className={`conversation-row ${active ? "active" : ""}`} key={conversation.id}><button className="conversation" onClick={() => selectConversation(conversation)}><span className="conversation-icon"><MessageIcon active={active} /></span><span className="conversation-copy"><strong>{conversation.title}</strong><small>{conversation.updatedAt}</small></span>{active && <span className="live-dot" />}</button><button type="button" className="conversation-delete" onClick={(event) => { event.stopPropagation(); deleteConversation(conversation.id); }} aria-label={`Delete ${conversation.title}`} title="Delete conversation"><Trash2 size={14} /></button></div>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-label"><span>Local workspace</span><span className="status-pill"><span className="mini-status" /> Ready</span></div>
          <div className="usage-bar"><span /></div>
          <button className="profile"><span className="profile-avatar">DS</span><span><strong>Debjyoti’s workspace</strong><small>Personal plan</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title"><button className="icon-button menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar"><Menu size={19} /></button><div><span>Workspace /</span><strong>{conversations.find((conversation) => conversation.id === currentConversationId)?.title ?? "Untitled workspace"}</strong></div></div>
          <div className="topbar-actions"><div className={`provider-state ${health.status}`}><span className="provider-dot" /><span>{health.status === "online" ? "Gemma ready" : "Connect Gemma"}</span></div><button className="icon-button" aria-label="Workspace settings"><Settings2 size={18} /></button><button className="avatar-button">DS</button></div>
        </header>

        <section className="conversation-stage">
          <div className="stage-inner">
            <div className="context-strip"><span className="context-icon"><Bot size={15} /></span><span>Private workspace</span><span className="context-separator">·</span><select className="model-select" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} aria-label="Choose model">{health.models.length > 0 ? health.models.map((model) => <option value={model} key={model}>{model}</option>) : <option value={selectedModel}>{selectedModel}</option>}</select><ChevronDown size={14} /></div>
            <div className="messages">
              {messages.map((message) => <article className={`message ${message.role}`} key={message.id}>
                <div className="message-avatar">{message.role === "assistant" ? <Sparkles size={16} /> : <User size={15} />}</div>
                <div className="message-body"><div className="message-meta"><strong>{message.role === "assistant" ? "Agentic" : "You"}</strong><span>{message.createdAt}</span>{message.role === "assistant" && <span className="verified"><Check size={11} /></span>}</div><MarkdownContent content={message.content} />{message.attachment && <div className="attachment-preview"><FileCode2 size={17} /><span><strong>{message.attachment.name}</strong><small>Attached file</small></span></div>}{message.imageUrl && <img className="generated-image" src={message.imageUrl} alt={message.content} />}</div>
              </article>)}
              {isSending && <article className="message assistant"><div className="message-avatar"><Sparkles size={16} /></div><div className="message-body"><div className="message-meta"><strong>Agentic</strong><span>thinking</span></div><div className="typing"><i /><i /><i /></div></div></article>}
              {notice && <div className="notice"><span>{notice}</span><button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}
            </div>
          </div>
        </section>

        <section className="composer-area">
          <div className="composer-wrap">
            {attachment && <div className="pending-file"><FileImage size={15} /><span>{attachment.filename}</span><small>{formatFileSize(attachment.size)}</small><button onClick={() => setAttachment(null)} aria-label="Remove attachment"><X size={14} /></button></div>}
            <form className="composer" onSubmit={handleSubmit}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSubmit(); } }} placeholder={mode === "image" ? "Describe the image you want to create..." : "Ask anything, or paste in a problem to solve..."} rows={1} />
              <div className="composer-toolbar"><div className="composer-tools"><input ref={fileInput} type="file" accept="image/*,.pdf,.txt" hidden onChange={handleFile} /><button type="button" className="tool-button" onClick={() => fileInput.current?.click()}><Paperclip size={16} /><span>Attach</span></button><button type="button" className={`tool-button ${mode === "image" ? "selected" : ""}`} onClick={() => setMode(mode === "chat" ? "image" : "chat")}><ImagePlus size={16} /><span>Image</span></button></div><div className="composer-submit"><span className="shortcut">Shift + Enter</span><button className="send-button" type="submit" aria-label="Send message" disabled={!input.trim() || isSending}><ArrowUp size={17} /></button></div></div>
            </form>
            <div className="composer-footer"><span>Agentic can make mistakes. Check important work.</span><span><Upload size={12} /> Files stay in your local workspace</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}

function MessageIcon({ active }: { active?: boolean }) {
  return active ? <Sparkles size={14} /> : <Bot size={14} />;
}

export default App;

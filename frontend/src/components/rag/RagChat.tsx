"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Check, Copy, Database, Menu, RotateCcw, Send, Trash2, User as UserIcon } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { ChatMessage, createChat, deleteChat, deleteChatMessage, getChatMessages, getUserChats, renameChat, saveChatMessage, updateChatMessage, type Chat } from "@/lib/firestore";
import { getChunks, getDocuments, deleteDocument as deleteStoredDocument, saveChunks, saveDocument, type RagDocument } from "@/lib/indexedDB";
import { embedDocuments, embedQuery } from "@/lib/embeddingApi";
import { rankChunks, type RankedChunk } from "@/lib/vectorSearch";
import { RagSource, sendRagChatMessage } from "@/lib/ragApi";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { ChatSidebar } from "../ChatSidebar";
import { DocumentList } from "./DocumentList";
import { DocumentUploader } from "./DocumentUploader";
import { RagSources } from "./RagSources";

const TOP_K = 5;
const MINIMUM_SIMILARITY = 0.15;

export function RagChat({ onSwitchToGeneral }: { onSwitchToGeneral: () => void }) {
  const { user, idToken: cachedToken, getIdToken } = useAuth();
  const uid = user?.uid || "";
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourcesByMessage, setSourcesByMessage] = useState<Record<string, RagSource[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshDocuments = useCallback(async () => {
    if (uid) setDocuments(await getDocuments(uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    let isMounted = true;
    void (async () => {
      try {
        await refreshDocuments();
        const items = await getUserChats(uid);
        if (!isMounted) return;
        setChats(items);
        if (items.length) setActiveChatId(items[0].id);
      } catch (reason) {
        if (isMounted) setError(reason instanceof Error ? reason.message : "Unable to load RAG data.");
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [uid, refreshDocuments]);

  useEffect(() => {
    if (!uid || !activeChatId) return undefined;
    let isMounted = true;
    void getChatMessages(uid, activeChatId)
      .then((loadedMessages) => {
        if (isMounted) setMessages(loadedMessages);
      })
      .catch(() => {
        if (isMounted) setError("Unable to load this chat.");
      });
    return () => {
      isMounted = false;
    };
  }, [uid, activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const handleUpload = async (files: File[]) => {
    setError(null);
    setBusy(true);
    try {
      const embedded = await embedDocuments(files);
      for (const document of embedded) {
        setProcessing(document.document_id);
        const sourceFile = files.find((file) => file.name === document.filename);
        const createdAt = Date.now();
        await saveDocument({
          documentId: document.document_id,
          userId: uid,
          filename: document.filename,
          characterCount: sourceFile ? (await sourceFile.text()).length : document.chunks.reduce((sum, chunk) => sum + chunk.text.length, 0),
          chunkCount: document.chunks.length,
          embeddingModel: document.embedding_model || "sentence-transformers/all-MiniLM-L6-v2",
          embeddingDimension: document.embedding_dimension || 384,
          createdAt,
        });
        await saveChunks(document.chunks.map((chunk) => ({
          chunkId: chunk.chunk_id,
          userId: uid,
          documentId: document.document_id,
          filename: document.filename,
          chunkIndex: chunk.chunk_index,
          text: chunk.text,
          embedding: chunk.embedding,
          createdAt,
        })));
      }
      await refreshDocuments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process notes.");
    } finally {
      setProcessing(null);
      setBusy(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteStoredDocument(documentId);
      await refreshDocuments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the document.");
    }
  };

  const retrieve = async (question: string, signal: AbortSignal): Promise<RankedChunk[]> => {
    const [queryEmbedding, chunks] = await Promise.all([embedQuery(question, signal), getChunks(uid)]);
    return rankChunks(queryEmbedding, chunks, TOP_K, MINIMUM_SIMILARITY);
  };

  const sendQuestion = async (question: string, replaceMessageId?: string) => {
    if (!question.trim() || busy || !uid || !documents.length) return;
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let chatId = activeChatId;
      if (!chatId) {
        const chat = await createChat(uid, question.slice(0, 30));
        chatId = chat.id;
        setActiveChatId(chat.id);
        setChats((current) => [chat, ...current]);
      }
      const selected = await retrieve(question.trim(), controller.signal);
      if (!selected.length) {
        setError("No uploaded note passage was relevant enough to answer this question.");
        return;
      }
      const sources: RagSource[] = selected.map((chunk) => ({ document_id: chunk.documentId, filename: chunk.filename, chunk_id: chunk.chunkId, chunk_index: chunk.chunkIndex, similarity: chunk.similarity }));
      const context = selected.map((chunk) => `[${chunk.filename}, chunk ${chunk.chunkIndex + 1}]\n${chunk.text}`).join("\n\n");
      const token = cachedToken || await getIdToken();
      if (!token) throw new Error("Authentication expired. Please sign in again.");
      const result = await sendRagChatMessage(token, question.trim(), context, sources, controller.signal);
      if (replaceMessageId) {
        const assistant = messages.find((message) => message.id === replaceMessageId);
        if (assistant) await updateChatMessage(uid, chatId, replaceMessageId, result.response);
        setMessages((current) => current.map((message) => message.id === replaceMessageId ? { ...message, content: result.response } : message));
        setSourcesByMessage((current) => ({ ...current, [replaceMessageId]: result.sources }));
      } else {
        const userMessage = await saveChatMessage(uid, chatId, "user", question.trim());
        const assistantMessage = await saveChatMessage(uid, chatId, "assistant", result.response);
        setMessages((current) => [...current, userMessage, assistantMessage]);
        setSourcesByMessage((current) => ({ ...current, [assistantMessage.id]: result.sources }));
      }
      setInput("");
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Unable to answer from the uploaded notes.");
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const regenerate = async (message: ChatMessage) => {
    const index = messages.findIndex((item) => item.id === message.id);
    const prior = messages[index - 1];
    if (prior?.role === "user") await sendQuestion(prior.content, message.id);
  };

  const newChat = () => { setActiveChatId(null); setMessages([]); setError(null); };
  const handleRenameChat = async (chatId: string, title: string) => {
    await renameChat(uid, chatId, title);
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, title } : chat));
  };
  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(uid, chatId);
    const remaining = chats.filter((chat) => chat.id !== chatId);
    setChats(remaining);
    if (activeChatId === chatId) {
      setActiveChatId(remaining[0]?.id || null);
      if (!remaining.length) setMessages([]);
    }
  };
  const copy = async (message: ChatMessage) => { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); setTimeout(() => setCopiedId(null), 1500); };
  const deleteMessage = async (messageId: string) => {
    if (!activeChatId) return;
    await deleteChatMessage(uid, activeChatId, messageId);
    setMessages((current) => current.filter((message) => message.id !== messageId));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100">
      <ChatSidebar chats={chats} activeChatId={activeChatId} onSelectChat={setActiveChatId} onNewChat={newChat} onRenameChat={handleRenameChat} onDeleteChat={handleDeleteChat} isOpen={sidebarOpen} onToggleOpen={() => setSidebarOpen((open) => !open)} modeLabel="RAG Mode" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800/80 px-4">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} className="rounded p-1 text-neutral-400 md:hidden"><Menu className="h-5 w-5" /></button><span className="font-semibold">RAG Mode</span><span className="rounded-full border border-emerald-800/60 bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">Notes only</span></div>
          <button type="button" onClick={onSwitchToGeneral} className="text-xs text-indigo-300 hover:text-indigo-200">General Mode</button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="order-first w-full shrink-0 space-y-4 overflow-y-auto border-b border-neutral-800 p-4 lg:order-last lg:w-80 lg:border-b-0 lg:border-l">
            <DocumentUploader disabled={busy} onUpload={handleUpload} />
            <DocumentList documents={documents} processing={processing} onDelete={handleDeleteDocument} />
          </aside>
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"><div className="mx-auto max-w-3xl space-y-5">
              {!messages.length && !busy && <div className="flex min-h-64 flex-col items-center justify-center text-center"><Database className="mb-4 h-12 w-12 text-emerald-400" /><h1 className="text-2xl font-bold">Ask your uploaded notes</h1><p className="mt-2 max-w-md text-sm text-neutral-400">Upload .txt notes, then ask questions. Answers are generated only from the most relevant passages.</p></div>}
              {messages.map((message) => { const isUser = message.role === "user"; return <div key={message.id} className={`group flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isUser ? "bg-indigo-600" : "border border-neutral-700 bg-neutral-800 text-emerald-400"}`}>{isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div><div className={`max-w-[85%] rounded-2xl border border-neutral-800 p-4 ${isUser ? "bg-indigo-600 text-white" : "bg-neutral-900/90"}`}>{isUser ? <p className="whitespace-pre-wrap text-sm">{message.content}</p> : <><MarkdownRenderer content={message.content} /><RagSources sources={sourcesByMessage[message.id] || []} /></>}<div className="mt-2 flex gap-1 opacity-0 transition group-hover:opacity-100"><button type="button" onClick={() => copy(message)} title="Copy"><Copy className="h-3.5 w-3.5" /></button>{!isUser && <button type="button" onClick={() => regenerate(message)} disabled={busy} title="Regenerate"><RotateCcw className="h-3.5 w-3.5" /></button>}<button type="button" onClick={() => deleteMessage(message.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>{copiedId === message.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}</div></div></div>; })}
              {busy && <div className="text-sm text-neutral-400">Searching notes and asking Qwen...</div>}
              {error && <div className="flex gap-2 rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
              <div ref={bottomRef} />
            </div></div>
            <footer className="border-t border-neutral-800 p-4"><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-2"><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendQuestion(input); } }} disabled={busy || !documents.length} rows={1} placeholder={documents.length ? "Ask a question about your notes..." : "Upload notes before asking a question"} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none" /><button type="button" onClick={() => void sendQuestion(input)} disabled={busy || !input.trim() || !documents.length} className="rounded-lg bg-emerald-600 p-2.5 text-white disabled:bg-neutral-800 disabled:text-neutral-500" title="Ask question"><Send className="h-4 w-4" /></button></div></footer>
          </main>
        </div>
      </div>
    </div>
  );
}

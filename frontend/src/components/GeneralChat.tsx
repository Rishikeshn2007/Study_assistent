"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  Trash2,
  AlertCircle,
  Menu,
  GraduationCap,
  BookOpen,
  Code2,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import {
  Chat,
  ChatMessage,
  getUserChats,
  createChat,
  getChatMessages,
  saveChatMessage,
  updateChatMessage,
  deleteChatMessage,
  renameChat,
  deleteChat,
} from "@/lib/firestore";
import { sendGeneralChatMessage } from "@/lib/api";
import { ChatSidebar } from "./ChatSidebar";
import { MarkdownRenderer } from "./MarkdownRenderer";

const SUGGESTIONS = [
  {
    icon: GraduationCap,
    title: "Explain Complex Concepts",
    prompt: "Can you explain how backpropagation works in neural networks with an intuitive analogy?",
  },
  {
    icon: Code2,
    title: "Debug & Optimize Code",
    prompt: "Here is a Python function that runs too slow. How can I optimize it for O(n) time?",
  },
  {
    icon: BookOpen,
    title: "Structured Study Plan",
    prompt: "Create a 2-week study plan to prepare for a college exam in Data Structures & Algorithms.",
  },
  {
    icon: HelpCircle,
    title: "Step-by-Step Problem Solving",
    prompt: "Walk me through how to solve a calculus integration by parts problem step-by-step.",
  },
];

export function GeneralChat() {
  const { user, idToken: contextIdToken, getIdToken } = useAuth();
  const uid = user?.uid || "";

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Message action states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Load user chats on mount or UID change
  useEffect(() => {
    if (!uid) return;

    let isMounted = true;
    async function loadInitialData() {
      try {
        const userChats = await getUserChats(uid);
        if (!isMounted) return;
        setChats(userChats);
        if (userChats.length > 0) {
          setActiveChatId(userChats[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to load user chats:", err);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Load messages when active chat changes
  useEffect(() => {
    let isMounted = true;

    async function loadChatMessages() {
      if (!uid || !activeChatId) {
        if (isMounted) setMessages([]);
        return;
      }

      try {
        const msgs = await getChatMessages(uid, activeChatId);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }

    loadChatMessages();
    return () => {
      isMounted = false;
    };
  }, [uid, activeChatId]);

  // Handle auto-expanding textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Select a chat from sidebar
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setError(null);
  };

  // Rename chat
  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      await renameChat(uid, chatId, newTitle);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error("Failed to rename chat:", err);
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(uid, chatId);
      const remainingChats = chats.filter((c) => c.id !== chatId);
      setChats(remainingChats);
      if (activeChatId === chatId) {
        if (remainingChats.length > 0) {
          setActiveChatId(remainingChats[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || loading || !uid) return;

    setError(null);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      setLoading(true);

      // Ensure active chat exists or create one
      let currentChatId = activeChatId;
      if (!currentChatId) {
        const titleSnippet =
          textToSend.length > 30
            ? `${textToSend.substring(0, 30)}...`
            : textToSend;
        const newChat = await createChat(uid, titleSnippet);
        currentChatId = newChat.id;
        setActiveChatId(newChat.id);
        setChats((prev) => [newChat, ...prev]);
      }

      // Save user message to Firestore
      const userMsg = await saveChatMessage(
        uid,
        currentChatId,
        "user",
        textToSend
      );
      setMessages((prev) => [...prev, userMsg]);

      // Get Firebase ID token — use already-stored token first to avoid slow async refresh
      console.log("[Chat] Getting ID token...");
      let idToken: string | null = contextIdToken;
      if (!idToken) {
        console.log("[Chat] No cached token, refreshing from Firebase...");
        idToken = await getIdToken();
      }
      if (!idToken) {
        throw new Error("Failed to acquire authentication token. Please re-login.");
      }
      console.log("[Chat] Token acquired, sending to backend...");

      // Prepare conversation history for Qwen
      const historyContext = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call FastAPI backend with a 90-second timeout
      console.log("[Chat] Calling /api/chat/general...");
      const aiContent = await sendGeneralChatMessage(
        idToken,
        textToSend,
        historyContext
      );
      console.log("[Chat] Response received!");

      // Save assistant response to Firestore
      const assistantMsg = await saveChatMessage(
        uid,
        currentChatId,
        "assistant",
        aiContent
      );
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error("Error generating AI response:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to obtain AI response.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message text
  const handleCopyMessage = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  // Start editing a user message
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  // Save edited user message & regenerate following AI response
  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim() || !activeChatId || !uid) return;

    try {
      const updatedText = editContent.trim();
      setEditingId(null);
      setLoading(true);

      // Update in Firestore
      await updateChatMessage(uid, activeChatId, msgId, updatedText);

      // Find index of edited message
      const msgIndex = messages.findIndex((m) => m.id === msgId);
      const priorHistory = messages.slice(0, msgIndex).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Update local state with edited message
      const updatedMessages = [...messages];
      updatedMessages[msgIndex] = {
        ...updatedMessages[msgIndex],
        content: updatedText,
      };
      setMessages(updatedMessages);

      // Get ID token and regenerate response
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Authentication expired. Please re-login.");

      const newAiContent = await sendGeneralChatMessage(
        idToken,
        updatedText,
        priorHistory
      );

      // If next message was an assistant message, update it; otherwise create new
      const nextMsg = messages[msgIndex + 1];
      if (nextMsg && nextMsg.role === "assistant") {
        await updateChatMessage(uid, activeChatId, nextMsg.id, newAiContent);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === nextMsg.id ? { ...m, content: newAiContent } : m
          )
        );
      } else {
        const assistantMsg = await saveChatMessage(
          uid,
          activeChatId,
          "assistant",
          newAiContent
        );
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to re-generate response.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Regenerate response for an assistant message
  const handleRegenerate = async (assistantMsgId: string) => {
    if (!activeChatId || !uid || loading) return;

    const msgIndex = messages.findIndex((m) => m.id === assistantMsgId);
    if (msgIndex <= 0) return;

    // Find the user prompt right before this assistant message
    const userPromptMsg = messages[msgIndex - 1];
    if (userPromptMsg.role !== "user") return;

    const priorHistory = messages.slice(0, msgIndex - 1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      setLoading(true);
      setError(null);

      const idToken = await getIdToken();
      if (!idToken) throw new Error("Authentication expired. Please re-login.");

      const newAiResponse = await sendGeneralChatMessage(
        idToken,
        userPromptMsg.content,
        priorHistory
      );

      // Update message in Firestore
      await updateChatMessage(uid, activeChatId, assistantMsgId, newAiResponse);

      // Update state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: newAiResponse } : m
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to regenerate.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChatId || !uid) return;
    try {
      await deleteChatMessage(uid, activeChatId, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* ChatGPT-style Sidebar */}
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top bar with mobile hamburger and status */}
        <header className="h-14 border-b border-neutral-800/80 px-4 flex items-center justify-between bg-neutral-950/80 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden cursor-pointer"
              title="Open Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white">General Mode</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                Qwen LLM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Firestore Synced</span>
            </div>
          </div>
        </header>

        {/* Message Stream Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
          {/* Empty State / Suggestions when no messages */}
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                How can I help your studies today?
              </h2>
              <p className="text-sm text-neutral-400 max-w-md mb-8">
                Ask any question, brainstorm study topics, paste code to debug, or explore complex academic concepts with Qwen AI.
              </p>

              {/* Suggestion prompt cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {SUGGESTIONS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="p-4 rounded-xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer group flex flex-col justify-between space-y-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-indigo-400 group-hover:text-indigo-300">
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold text-neutral-200">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isEditing = editingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-3.5 transition-opacity ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                      isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-neutral-800 text-indigo-400 border border-neutral-700/60"
                    }`}
                  >
                    {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
                    {isEditing ? (
                      <div className="w-full bg-neutral-900 rounded-2xl p-3 border border-indigo-500 shadow-lg space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-transparent text-sm text-neutral-100 focus:outline-hidden resize-none"
                          rows={3}
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                          >
                            Save & Resubmit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-xs ${
                          isUser
                            ? "bg-indigo-600 text-white rounded-tr-xs"
                            : "bg-neutral-900/90 text-neutral-200 border border-neutral-800/80 rounded-tl-xs"
                        }`}
                      >
                        {isUser ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}
                      </div>
                    )}

                    {/* Message Actions Toolbar */}
                    {!isEditing && (
                      <div
                        className={`flex items-center gap-1 mt-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-md hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit Button (User only) */}
                        {isUser && (
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="p-1.5 rounded-md hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                            title="Edit message"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Regenerate Button (Assistant only) */}
                        {!isUser && (
                          <button
                            onClick={() => handleRegenerate(msg.id)}
                            disabled={loading}
                            className="p-1.5 rounded-md hover:bg-neutral-800 hover:text-neutral-200 transition-colors disabled:opacity-50"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 rounded-md hover:bg-neutral-800 hover:text-red-400 transition-colors"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* AI Typing / Thinking Indicator */}
            {loading && (
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-800 text-indigo-400 border border-neutral-700/60 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 rounded-tl-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-xs text-neutral-400 font-medium ml-1">
                      Thinking with Qwen...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Error</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Bar Area */}
        <footer className="p-4 bg-neutral-950 border-t border-neutral-800/80 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end rounded-2xl bg-neutral-900 border border-neutral-800 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all p-2 shadow-lg">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or request study help... (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={loading}
                className="flex-1 max-h-48 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 px-3 py-1.5 focus:outline-hidden resize-none leading-relaxed"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || loading}
                type="button"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white disabled:text-neutral-500 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-md active:scale-95"
                title="Send prompt"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-neutral-400">
              Qwen LLM can assist with your study concepts. Chats are saved to your personal Firebase Firestore.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

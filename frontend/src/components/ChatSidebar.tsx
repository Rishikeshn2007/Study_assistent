"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { Chat } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  isOpen: boolean;
  onToggleOpen: () => void;
  modeLabel?: string;
}

export function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  isOpen,
  onToggleOpen,
  modeLabel = "General Mode",
}: ChatSidebarProps) {
  const { user, backendUser, logout } = useAuth();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const displayName = backendUser?.name || user?.displayName || "Student";
  const displayEmail = backendUser?.email || user?.email || "";
  const displayPhoto = backendUser?.picture || user?.photoURL;
  const initial = displayName.charAt(0).toUpperCase();

  const handleStartRename = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = async (e: React.MouseEvent | React.FormEvent, chatId: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await onRenameChat(chatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await onDeleteChat(chatId);
    setDeletingChatId(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 bg-neutral-900 border-r border-neutral-800/80 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header with New Chat button */}
        <div className="p-4 border-b border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Study Assistant</h2>
                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                  {modeLabel}
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onToggleOpen();
            }}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Recent Chats ({chats.length})
          </div>

          {chats.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-neutral-400">
              No previous chats yet.<br />Start a conversation above!
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isEditing = chat.id === editingChatId;
              const isConfirmingDelete = chat.id === deletingChatId;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    if (!isEditing && !isConfirmingDelete) {
                      onSelectChat(chat.id);
                      if (window.innerWidth < 768) onToggleOpen();
                    }
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-neutral-800 text-white font-medium shadow-xs border border-neutral-700/60"
                      : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-neutral-400"}`} />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(e, chat.id)}
                        className="flex items-center gap-1 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-neutral-950 px-2 py-1 rounded text-xs text-white border border-indigo-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(e, chat.id)}
                          className="p-1 hover:text-emerald-400 text-neutral-400"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 hover:text-red-400 text-neutral-400"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate">{chat.title}</span>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/60">
                          <button
                            type="button"
                            onClick={(e) => handleConfirmDelete(e, chat.id)}
                            className="text-[10px] text-red-300 hover:text-white font-bold"
                            title="Confirm delete"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingChatId(null);
                            }}
                            className="text-neutral-400 hover:text-white p-0.5"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(e, chat)}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/60"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingChatId(chat.id);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-700/60"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 border border-neutral-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                {displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-bold text-white">{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-200 truncate">{displayName}</p>
                <p className="text-[10px] text-neutral-400 truncate">{displayEmail}</p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              type="button"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

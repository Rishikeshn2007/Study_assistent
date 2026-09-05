import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

// Timeout helper to guarantee Firestore calls never hang indefinitely
const FIRESTORE_TIMEOUT_MS = 3500;
let cloudSyncAvailable = true;

function disableCloudSync(error: unknown): void {
  if (!cloudSyncAvailable) return;
  cloudSyncAvailable = false;
  console.warn(
    "[Firestore] Cloud sync is unavailable; using local cache for this session.",
    error
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = FIRESTORE_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore request timed out after ${timeoutMs}ms. (Ensure Cloud Firestore is created in Firebase Console).`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ==========================================
// LocalStorage Fallback Helpers
// ==========================================
function getLocalChats(uid: string): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`study_chats_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalChats(uid: string, chats: Chat[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`study_chats_${uid}`, JSON.stringify(chats));
  } catch (err) {
    console.warn("Failed to write chats to localStorage:", err);
  }
}

function getLocalMessages(uid: string, chatId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`study_msgs_${uid}_${chatId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessages(uid: string, chatId: string, msgs: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`study_msgs_${uid}_${chatId}`, JSON.stringify(msgs));
  } catch (err) {
    console.warn("Failed to write messages to localStorage:", err);
  }
}

// ==========================================
// Exported Firestore Service Functions
// ==========================================

/**
 * Get all chats belonging to a user UID, ordered by most recently updated
 */
export async function getUserChats(uid: string): Promise<Chat[]> {
  if (!uid) return [];
  if (!cloudSyncAvailable) return getLocalChats(uid);
  try {
    const chatsRef = collection(db, "users", uid, "chats");
    const q = query(chatsRef, orderBy("updatedAt", "desc"));
    const snapshot = await withTimeout(getDocs(q), 3000);

    const chats: Chat[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      chats.push({
        id: docSnap.id,
        title: data.title || "New Chat",
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      });
    });

    // Update local cache
    saveLocalChats(uid, chats);
    return chats;
  } catch (error) {
    disableCloudSync(error);
    return getLocalChats(uid);
  }
}

/**
 * Create a new chat under the user's UID
 */
export async function createChat(uid: string, initialTitle: string = "New Chat"): Promise<Chat> {
  const now = Date.now();
  const randomId = "chat_" + Math.random().toString(36).substring(2, 11) + "_" + now;

  const newChat: Chat = {
    id: randomId,
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Immediately save to local cache so user never waits
  const existing = getLocalChats(uid);
  saveLocalChats(uid, [newChat, ...existing.filter((c) => c.id !== newChat.id)]);

  // 2. Attempt cloud Firestore sync in background with timeout
  if (!cloudSyncAvailable) return newChat;
  try {
    const chatsRef = collection(db, "users", uid, "chats");
    const newChatDoc = doc(chatsRef, randomId);
    await withTimeout(setDoc(newChatDoc, newChat), 3000);
  } catch (err) {
    disableCloudSync(err);
  }

  return newChat;
}

/**
 * Retrieve all messages for a specific chat, ordered chronologically
 */
export async function getChatMessages(uid: string, chatId: string): Promise<ChatMessage[]> {
  if (!uid || !chatId) return [];
  if (!cloudSyncAvailable) return getLocalMessages(uid, chatId);
  try {
    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const snapshot = await withTimeout(getDocs(q), 3000);

    const messages: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        role: data.role as "user" | "assistant",
        content: data.content || "",
        createdAt: data.createdAt || Date.now(),
      });
    });

    saveLocalMessages(uid, chatId, messages);
    return messages;
  } catch (error) {
    disableCloudSync(error);
    return getLocalMessages(uid, chatId);
  }
}

/**
 * Save a message into the chat's subcollection and update the chat's timestamp
 */
export async function saveChatMessage(
  uid: string,
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<ChatMessage> {
  const now = Date.now();
  const randomId = "msg_" + Math.random().toString(36).substring(2, 11) + "_" + now;

  const message: ChatMessage = {
    id: randomId,
    role,
    content,
    createdAt: now,
  };

  // 1. Immediately cache locally
  const currentLocal = getLocalMessages(uid, chatId);
  saveLocalMessages(uid, chatId, [...currentLocal, message]);

  // Update chat timestamp in local chats
  const localChats = getLocalChats(uid);
  const updatedLocalChats = localChats.map((c) =>
    c.id === chatId ? { ...c, updatedAt: now } : c
  );
  saveLocalChats(uid, updatedLocalChats);

  // 2. Attempt cloud sync with timeout
  if (!cloudSyncAvailable) return message;
  try {
    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    const newMsgDoc = doc(messagesRef, randomId);
    await withTimeout(setDoc(newMsgDoc, message), 3000);

    const chatDocRef = doc(db, "users", uid, "chats", chatId);
    await withTimeout(updateDoc(chatDocRef, { updatedAt: now }), 2000).catch(() => {});
  } catch (err) {
    disableCloudSync(err);
  }

  return message;
}

/**
 * Update the text content of a message (Edit message)
 */
export async function updateChatMessage(
  uid: string,
  chatId: string,
  messageId: string,
  newContent: string
): Promise<void> {
  // Update locally first
  const msgs = getLocalMessages(uid, chatId);
  const updated = msgs.map((m) => (m.id === messageId ? { ...m, content: newContent } : m));
  saveLocalMessages(uid, chatId, updated);

  if (!cloudSyncAvailable) return;
  try {
    const msgDocRef = doc(db, "users", uid, "chats", chatId, "messages", messageId);
    await withTimeout(updateDoc(msgDocRef, { content: newContent }), 3000);
  } catch (err) {
    disableCloudSync(err);
  }
}

/**
 * Delete a specific message from a chat
 */
export async function deleteChatMessage(
  uid: string,
  chatId: string,
  messageId: string
): Promise<void> {
  // Delete locally first
  const msgs = getLocalMessages(uid, chatId);
  const remaining = msgs.filter((m) => m.id !== messageId);
  saveLocalMessages(uid, chatId, remaining);

  if (!cloudSyncAvailable) return;
  try {
    const msgDocRef = doc(db, "users", uid, "chats", chatId, "messages", messageId);
    await withTimeout(deleteDoc(msgDocRef), 3000);
  } catch (err) {
    disableCloudSync(err);
  }
}

/**
 * Rename a chat title
 */
export async function renameChat(
  uid: string,
  chatId: string,
  newTitle: string
): Promise<void> {
  const cleanTitle = newTitle.trim() || "Untitled Chat";
  const now = Date.now();

  // Update locally
  const chats = getLocalChats(uid);
  const updated = chats.map((c) => (c.id === chatId ? { ...c, title: cleanTitle, updatedAt: now } : c));
  saveLocalChats(uid, updated);

  if (!cloudSyncAvailable) return;
  try {
    const chatDocRef = doc(db, "users", uid, "chats", chatId);
    await withTimeout(updateDoc(chatDocRef, { title: cleanTitle, updatedAt: now }), 3000);
  } catch (err) {
    disableCloudSync(err);
  }
}

/**
 * Delete a chat and all its messages
 */
export async function deleteChat(uid: string, chatId: string): Promise<void> {
  // Delete locally
  const chats = getLocalChats(uid);
  saveLocalChats(uid, chats.filter((c) => c.id !== chatId));
  if (typeof window !== "undefined") {
    localStorage.removeItem(`study_msgs_${uid}_${chatId}`);
  }

  if (!cloudSyncAvailable) return;
  try {
    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    const snapshot = await withTimeout(getDocs(messagesRef), 3000);

    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const chatDocRef = doc(db, "users", uid, "chats", chatId);
    batch.delete(chatDocRef);

    await withTimeout(batch.commit(), 3000);
  } catch (err) {
    disableCloudSync(err);
  }
}

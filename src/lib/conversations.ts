import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ---- Types ----

export interface ConversationData {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: Timestamp | null;
  lastSenderId: string;
  unreadCount: Record<string, number>;
  propertyId?: string;
  propertyName?: string;
  propertyImage?: string;
  unitId?: string;
  unitName?: string;
  status: "active" | "archived";
  mutedBy: string[]; // user IDs who muted this conversation
  createdAt: Timestamp | null;
}

export interface MessageAttachment {
  type: "image" | "document" | "file";
  name: string;
  url: string;        // Will be populated by bunny.net CDN URL
  size?: number;       // File size in bytes
  mimeType?: string;
}

export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  read: boolean;
  attachments: MessageAttachment[];  // For future bunny.net file sending
  createdAt: Timestamp | null;
}

// ---- Cache Helpers (localStorage for offline-first & cost savings) ----

const CACHE_PREFIX = "rentke_cache_";
const CONV_CACHE_KEY = (uid: string) => `${CACHE_PREFIX}conversations_${uid}`;
const CONV_CACHE_TS_KEY = (uid: string) => `${CACHE_PREFIX}conversations_ts_${uid}`;
const MSG_CACHE_KEY = (cid: string) => `${CACHE_PREFIX}messages_${cid}`;
const MSG_CACHE_TS_KEY = (cid: string) => `${CACHE_PREFIX}messages_ts_${cid}`;

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function getCachedConversations(userId: string): ConversationData[] | null {
  if (typeof window === "undefined") return null;
  return safeJson<ConversationData[]>(localStorage.getItem(CONV_CACHE_KEY(userId)));
}

export function setCachedConversations(userId: string, convs: ConversationData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONV_CACHE_KEY(userId), JSON.stringify(convs));
    localStorage.setItem(CONV_CACHE_TS_KEY(userId), String(Date.now()));
  } catch { /* quota exceeded — silently ignore */ }
}

export function getCachedConversationsTimestamp(userId: string): number | null {
  if (typeof window === "undefined") return null;
  const ts = localStorage.getItem(CONV_CACHE_TS_KEY(userId));
  return ts ? parseInt(ts, 10) : null;
}

export function getCachedMessages(conversationId: string): MessageData[] | null {
  if (typeof window === "undefined") return null;
  return safeJson<MessageData[]>(localStorage.getItem(MSG_CACHE_KEY(conversationId)));
}

export function setCachedMessages(conversationId: string, msgs: MessageData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MSG_CACHE_KEY(conversationId), JSON.stringify(msgs));
    localStorage.setItem(MSG_CACHE_TS_KEY(conversationId), String(Date.now()));
  } catch { /* silently ignore */ }
}

// ---- Refs ----

const conversationsRef = collection(db, "conversations");
const messagesRef = collection(db, "messages");

// ---- Listeners ----

/** Listen to a user's active conversations in real-time. */
export function listenToConversations(
  userId: string,
  onData: (convs: ConversationData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    conversationsRef,
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConversationData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          participants: data.participants || [],
          participantNames: data.participantNames || {},
          lastMessage: data.lastMessage || "",
          lastMessageTime: data.lastMessageTime || null,
          lastSenderId: data.lastSenderId || "",
          unreadCount: data.unreadCount || {},
          propertyId: data.propertyId || undefined,
          propertyName: data.propertyName || undefined,
          propertyImage: data.propertyImage || undefined,
          unitId: data.unitId || undefined,
          unitName: data.unitName || undefined,
          status: data.status || "active",
          mutedBy: data.mutedBy || [],
          createdAt: data.createdAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

/** Listen to messages in a conversation in real-time. */
export function listenToMessages(
  conversationId: string,
  onData: (msgs: MessageData[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    messagesRef,
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc"),
    limit(200)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: MessageData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          conversationId: data.conversationId || "",
          senderId: data.senderId || "",
          text: data.text || "",
          read: data.read || false,
          attachments: data.attachments || [],
          createdAt: data.createdAt || null,
        };
      });
      onData(list);
    },
    (err) => onError(err)
  );
}

// ---- Send / Create / Read ----

/** Send a message (with optional attachments for bunny.net). */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
  attachments?: MessageAttachment[]
): Promise<void> {
  await addDoc(messagesRef, {
    conversationId,
    senderId,
    text,
    read: false,
    attachments: attachments || [],
    createdAt: serverTimestamp(),
  });

  // Update conversation's last message and increment unread for other participants
  await updateDoc(doc(conversationsRef, conversationId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
    lastSenderId: senderId,
    [`unreadCount.${senderId}`]: 0,
  });

  // Increment unread count for all participants except the sender
  // Firestore doesn't support dynamic field paths with increment in the same call,
  // so we read first, then update
  const convSnap = await getDoc(doc(conversationsRef, conversationId));
  if (convSnap.exists()) {
    const convData = convSnap.data();
    const participants: string[] = convData.participants || [];
    const batch = writeBatch(db);
    participants.forEach((p) => {
      if (p !== senderId) {
        batch.update(doc(conversationsRef, conversationId), {
          [`unreadCount.${p}`]: increment(1),
        });
      }
    });
    await batch.commit();
  }
}

/** Mark conversation messages as read. */
export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  // Reset unread count on conversation
  await updateDoc(doc(conversationsRef, conversationId), {
    [`unreadCount.${userId}`]: 0,
  });

  // Mark individual unread messages from other participants as read
  const q = query(
    messagesRef,
    where("conversationId", "==", conversationId),
    where("read", "==", false),
    limit(200)
  );
  const snapshot = await getDocs(q);
  // Filter client-side to avoid composite index requirement for `!=`
  const unreadOthers = snapshot.docs.filter(d => d.data().senderId !== userId);
  if (unreadOthers.length > 0) {
    const batch = writeBatch(db);
    unreadOthers.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  }
}

/** Create a new conversation. */
export async function createConversation(
  data: {
    participants: string[];
    participantNames: Record<string, string>;
    propertyId?: string;
    propertyName?: string;
    propertyImage?: string;
    unitId?: string;
    unitName?: string;
    firstMessage: string;
    firstMessageAttachments?: MessageAttachment[];
    senderId: string;
  }
): Promise<string> {
  const unreadCount: Record<string, number> = {};
  data.participants.forEach((p) => {
    unreadCount[p] = p === data.senderId ? 0 : 1;
  });

  const docRef = await addDoc(conversationsRef, {
    participants: data.participants,
    participantNames: data.participantNames,
    lastMessage: data.firstMessage,
    lastMessageTime: serverTimestamp(),
    lastSenderId: data.senderId,
    unreadCount,
    propertyId: data.propertyId || null,
    propertyName: data.propertyName || null,
    propertyImage: data.propertyImage || null,
    unitId: data.unitId || null,
    unitName: data.unitName || null,
    status: "active",
    mutedBy: [],
    createdAt: serverTimestamp(),
  });

  // Also add the first message with attachments
  await addDoc(messagesRef, {
    conversationId: docRef.id,
    senderId: data.senderId,
    text: data.firstMessage,
    read: false,
    attachments: data.firstMessageAttachments || [],
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// ---- Clear / Archive / Mute ----

/** Delete all messages in a conversation (clear chat). */
export async function clearConversationMessages(
  conversationId: string
): Promise<void> {
  const q = query(messagesRef, where("conversationId", "==", conversationId));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.forEach((d) => {
    batch.delete(d.ref);
  });
  await batch.commit();

  // Reset conversation's last message
  await updateDoc(doc(conversationsRef, conversationId), {
    lastMessage: "",
    lastMessageTime: serverTimestamp(),
    lastSenderId: "",
  });
}

/** Archive a conversation (soft delete from main view). */
export async function archiveConversation(
  conversationId: string
): Promise<void> {
  await updateDoc(doc(conversationsRef, conversationId), {
    status: "archived",
  });
}

/** Unarchive a conversation. */
export async function unarchiveConversation(
  conversationId: string
): Promise<void> {
  await updateDoc(doc(conversationsRef, conversationId), {
    status: "active",
  });
}

/** Toggle mute for a conversation. */
export async function toggleMuteConversation(
  conversationId: string,
  userId: string,
  muted: boolean
): Promise<void> {
  const convRef = doc(conversationsRef, conversationId);
  if (muted) {
    await updateDoc(convRef, {
      mutedBy: arrayUnion(userId),
    });
  } else {
    await updateDoc(convRef, {
      mutedBy: arrayRemove(userId),
    });
  }
}

// ---- Unread ----

/** Get total unread count for a user. */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  const q = query(
    conversationsRef,
    where("participants", "array-contains", userId)
  );
  const snapshot = await getDocs(q);
  let total = 0;
  snapshot.forEach((d) => {
    const data = d.data();
    total += (data.unreadCount?.[userId] || 0);
  });
  return total;
}

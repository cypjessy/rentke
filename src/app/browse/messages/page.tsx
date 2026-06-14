"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Edit3,
  ArrowLeft,
  Phone,
  MoreVertical,
  ExternalLink,
  Plus,
  Send,
  Mic,
  X,
  Clock,
  Camera,
  Image,
  FileText,
  MapPin,
  Contact,
  Receipt,
  User,
  BellOff,
  Trash2,
  CheckCheck,
  MessageCircle,
  Calendar,
  Sparkles,
  Copy,
  Ban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useBrowse } from "../BrowseContext";
import { useAuth } from "../../AuthContext";
import {
  listenToConversations,
  listenToMessages,
  sendMessage as sendMessageFS,
  markConversationRead,
  createConversation,
} from "../../../lib/conversations";
import type { ConversationData, MessageData } from "../../../lib/conversations";
import { Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadPhoto, takePhoto, openFilePicker } from "@/lib/upload";

const attachOptions = [
  { label: "Camera", icon: Camera, color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { label: "Gallery", icon: Image, color: "#047857", bg: "rgba(4,120,87,0.15)" },
  { label: "Document", icon: FileText, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { label: "Location", icon: MapPin, color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  { label: "Contact", icon: Contact, color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  { label: "M-Pesa", icon: Receipt, color: "#25D366", bg: "rgba(37,211,102,0.15)" },
];

const chatMenuItems = [
  { label: "View Profile", icon: User, color: "#a3a3a3" },
  { label: "Search in Chat", icon: Search, color: "#a3a3a3" },
  { label: "Mute Notifications", icon: BellOff, color: "#a3a3a3" },
  { label: "Block User", icon: Ban, color: "#ef4444", danger: true },
  { label: "Clear Chat", icon: Trash2, color: "#ef4444" },
];

// ---- Time Helpers ----
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en", { weekday: "short" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const autoReplies = [
  "Sure, I can arrange that for you.",
  "Yes, that works! Let me confirm.",
  "The property is available for viewing tomorrow.",
  "M-Pesa paybill is 123456, account is your name.",
  "Let me check and get back to you shortly.",
];

export default function MessagesPage() {
  const router = useRouter();
  const { showSnackbar, setUnreadMessageCount } = useBrowse();

  // ---- State ----
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [otherParticipantPhone, setOtherParticipantPhone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "landlords">("all");
  const [chatClosing, setChatClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [replyContext, setReplyContext] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sheetOpen, setSheetOpen] = useState<"search-msg" | "attach" | "chat-menu" | null>(null);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [reactedMessages, setReactedMessages] = useState<Record<number, string>>({});
  const [selectedMsgIndex, setSelectedMsgIndex] = useState<number | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [currentMessages, setCurrentMessages] = useState<MessageData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  // ---- Firestore Listener for Conversations ----
  useEffect(() => {
    const uid = user?.uid || "";
    if (!uid) return;
    const unsub = listenToConversations(uid, (data) => {
      setConversations(data);
      setMessagesLoading(false);
      const totalUnread = data.reduce((sum, c) => sum + (c.unreadCount?.[uid] || 0), 0);
      setUnreadMessageCount(totalUnread);
    }, (err) => {
      console.error("Conversations listener error:", err);
      setMessagesLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // ---- Firestore Listener for Messages in Active Chat ----
  useEffect(() => {
    if (!activeChat) {
      setCurrentMessages([]);
      return;
    }
    const unsub = listenToMessages(activeChat, (data) => {
      setCurrentMessages(data);
    }, (err) => {
      console.error("Messages listener error:", err);
    });
    // Mark read
    if (user?.uid) markConversationRead(activeChat, user.uid);
    return () => unsub();
  }, [activeChat, user?.uid]);

  // ---- Derived ----
  const uid = user?.uid || "";
  const activeChatData = conversations.find((c) => c.id === activeChat) || null;

  // Build enriched chat list from conversations
  const enrichedChats = conversations.map((conv) => {
    const otherParticipantId = conv.participants.find((p) => p !== uid) || "";
    const otherName = conv.participantNames[otherParticipantId] || "User";
    const initial = otherName.charAt(0).toUpperCase();
    const unread = conv.unreadCount?.[uid] || 0;
    const lastMsgTime = conv.lastMessageTime
      ? formatTimeAgo(conv.lastMessageTime.toDate())
      : "";
    return {
      id: conv.id,
      name: otherName,
      initial,
      avatarBg: "linear-gradient(135deg, #047857, #059669)" as string,
      lastMsg: conv.lastMessage || "",
      time: lastMsgTime,
      unread,
      online: false,
      property: conv.propertyName || "",
      propertyPrice: "",
      propertyImg: "",
      messages: currentMessages.map((m) => ({
        type: (m.senderId === uid ? "sent" : "received") as "sent" | "received",
        text: m.text,
        time: m.createdAt ? formatTime(m.createdAt.toDate()) : "",
        read: m.read,
      })),
    };
  });

  const displayChat = enrichedChats.find((c) => c.id === activeChat) || null;

  // Tab-filtered chats
  const tabFilteredChats =
    activeTab === "unread"
      ? enrichedChats.filter((c) => c.unread > 0)
      : activeTab === "landlords"
        ? enrichedChats.filter((c) => c.unread > 0 || c.online)
        : enrichedChats;

  // Search within tab-filtered
  const filteredChats = tabFilteredChats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by time period
  const groupChatsByTime = (chats: typeof enrichedChats) => {
    const today: typeof enrichedChats = [];
    const yesterday: typeof enrichedChats = [];
    const thisWeek: typeof enrichedChats = [];
    const earlier: typeof enrichedChats = [];

    chats.forEach((chat) => {
      const time = chat.time;
      if (
        time === "Just now" ||
        /^\d+[ms]/.test(time) ||
        /^\d+h/.test(time)
      ) {
        today.push(chat);
      } else if (time === "Yesterday") {
        yesterday.push(chat);
      } else if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(time)) {
        thisWeek.push(chat);
      } else {
        earlier.push(chat);
      }
    });

    const groups: { label: string; chats: typeof enrichedChats }[] = [];
    if (today.length) groups.push({ label: "Today", chats: today });
    if (yesterday.length) groups.push({ label: "Yesterday", chats: yesterday });
    if (thisWeek.length) groups.push({ label: "This Week", chats: thisWeek });
    if (earlier.length) groups.push({ label: "Earlier", chats: earlier });
    return groups;
  };

  // Chat groups (only for list view, not active chat)
  const chatGroups = !activeChat ? groupChatsByTime(filteredChats) : [];

  // ---- Bottom Sheet ----
  const openSheet = (id: typeof sheetOpen) => {
    setSheetOpen(id);
    document.body.style.overflow = "hidden";
  };
  const closeSheet = () => {
    setSheetOpen(null);
    document.body.style.overflow = "";
  };

  // ---- Open Chat ----
  const openChat = (id: string) => {
    setActiveChat(id);
    setOtherParticipantPhone(null);
    // Mark as read
    if (user?.uid) markConversationRead(id, user.uid);
    // Look up other participant's phone
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      const otherId = conv.participants.find((p) => p !== uid) || "";
      if (otherId) {
        getDoc(doc(db, "users", otherId)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const phone = data.phoneNumber || data.phone || "";
            setOtherParticipantPhone(phone);
          }
        }).catch(() => {});
      }
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const closeChat = () => {
    setChatClosing(true);
    setTimeout(() => {
      setActiveChat(null);
      setChatClosing(false);
      setReplyContext(null);
      setIsTyping(false);
      setChatInput("");
    }, 300);
  };

  // ---- Send Message ----
  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !activeChat || !user?.uid) return;

    // Optimistically add the message locally so it appears instantly
    const optimisticMsg: MessageData = {
      id: `opt-${Date.now()}`,
      conversationId: activeChat,
      senderId: user.uid,
      text,
      read: false,
      attachments: [],
      createdAt: Timestamp.fromDate(new Date()),
    };
    setCurrentMessages((prev) => [...prev, optimisticMsg]);

    // Write to Firestore — the listener will replace currentMessages when it fires
    sendMessageFS(activeChat, user.uid, text);
    setChatInput("");
    setReplyContext(null);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // ---- Input handlers ----
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openReplyContext = (text: string) => {
    setReplyContext(text);
  };

  // Close chat search (for exit button)
  const closeChatSearch = () => {
    setShowChatSearch(false);
    setChatSearchQuery("");
  };

  // Quick reply insert
  const insertQuickReply = (text: string) => {
    setChatInput(text);
    setShowQuickReplies(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ---- Send Image ----
  const handleSendImage = async (source: "camera" | "gallery") => {
    if (uploadingImage) return;
    if (!activeChat || !user?.uid) {
      showSnackbar("No active chat", "error");
      return;
    }
    setUploadingImage(true);
    try {
      let file: File | null = null;
      if (source === "camera") {
        file = await takePhoto("camera");
      } else {
        const files = await openFilePicker("image/*", false);
        file = files[0] || null;
      }
      if (!file) {
        setUploadingImage(false);
        return;
      }
      const result = await uploadPhoto(file, "chat-images", user.uid);
      await sendMessageFS(activeChat, user.uid, "📷 Photo", [{
        type: "image",
        name: file.name,
        url: result.url,
        size: file.size,
        mimeType: file.type,
      }]);
      setUploadingImage(false);
      setTimeout(() => showSnackbar("Image sent 📷", "success"), 300);
    } catch (err: any) {
      setUploadingImage(false);
      showSnackbar(err?.message || "Failed to send image", "error");
    }
  };

  // ---- Attach Action ----
  const handleAttach = (type: string) => {
    closeSheet();
    if (type === "Camera" || type === "Gallery") {
      handleSendImage(type === "Camera" ? "camera" : "gallery");
    } else if (type === "M-Pesa" || type === "Receipt") {
      showSnackbar(`Attaching ${type} receipt...`, "info");
    } else {
      showSnackbar(`Opening ${type}...`, "info");
    }
  };

  // ---- Chat Menu ----
  const handleMenuAction = (label: string) => {
    closeSheet();
    if (label === "Clear Chat") {
      showSnackbar("Chat cleared", "success");
      return;
    }
    if (label === "Search in Chat") {
      setShowChatSearch(true);
      return;
    }
    if (label === "Block User" && activeChatData) {
      const otherId = activeChatData.participants.find((p: string) => p !== uid) || "";
      const otherName = activeChatData.participantNames[otherId] || "User";
      showSnackbar(`${otherName} has been blocked`, "info");
      return;
    }
    const msgs: Record<string, string> = {
      "View Profile": "Viewing profile...",
      "Mute Notifications": "Notifications muted",
    };
    showSnackbar(msgs[label] || "Action completed", "success");
  };

  // ---- Message Actions ----
  const handleMessageAction = (action: string, msgIndex: number) => {
    setSelectedMsgIndex(null);
    closeSheet();
    if (action === "copy") {
      const text = currentMessages[msgIndex]?.text;
      if (text) {
        navigator.clipboard.writeText(text).catch(() => {});
        showSnackbar("Message copied", "success");
      }
    }
    if (action === "delete") {
      showSnackbar("Message deleted", "success");
    }
  };

  // ---- Emoji Reactions ----
  const reactionEmojis = ["👍", "❤️", "😊", "😮", "😢"];
  const handleReact = (emoji: string, msgIndex: number) => {
    setReactedMessages((prev) => ({
      ...prev,
      [msgIndex]: prev[msgIndex] === emoji ? "" : emoji,
    }));
    setSelectedMsgIndex(null);
    closeSheet();
    showSnackbar("Reacted " + emoji, "info");
  };

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div
      style={{
        overflowX: "hidden",
        width: "100%",
        maxWidth: "100vw",
        minHeight: "100dvh",
        position: "relative",
      }}
    >
      {/* Glow */}
      {!activeChat && (
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(4,120,87,0.06)",
            filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ============================================ */}
      {/* VIEW 1: MESSAGES LIST */}
      {/* ============================================ */}
      {!activeChat && (
        <div
          style={{
            animation: "slideInUp 0.4s ease",
          }}
        >
          <div className="status-bar" />

          {/* Header */}
          <header
            className="px-3 pt-4 pb-3 flex items-center justify-between"
            style={{ animation: "slideInUp 0.5s ease" }}
          >
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <div className="flex gap-2">
              <button
                onClick={() => openSheet("search-msg")}
                className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <Search className="w-5 h-5" style={{ color: "#e5e5e5" }} />
              </button>
              <button
                onClick={() => router.push("/browse/explore")}
                className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Edit3 className="w-5 h-5" style={{ color: "#047857" }} />
              </button>
            </div>
          </header>

          {/* Search Bar */}
          <div
            className="px-3 mb-4"
            style={{ animation: "slideInUp 0.6s ease" }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Search
                className="w-4 h-4"
                style={{ color: "#525252" }}
              />
              <input
                type="text"
                placeholder="Search messages..."
                className="bg-transparent outline-none text-sm flex-1"
                style={{ color: "#e5e5e5", caretColor: "#047857" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ====== TAB FILTERS ====== */}
          <div
            className="flex gap-2 px-3 mt-1 mb-3 overflow-x-auto browse-scroll-hidden"
            style={{ animation: "slideInUp 0.6s ease" }}
          >
            {[
              { key: "all", label: "All", count: enrichedChats.length },
              { key: "unread", label: "Unread", count: enrichedChats.filter((c) => c.unread > 0).length },
              { key: "landlords", label: "Landlords", count: enrichedChats.filter((c) => c.online || c.unread > 0).length },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`filter-chip ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
              >
                {tab.label}
                <span className="count">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Chat List */}
          <div className="px-2 pb-24">
            {chatGroups.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#525252" }}>
                  {activeTab === "unread"
                    ? "No unread messages"
                    : activeTab === "landlords"
                      ? "No landlord conversations"
                      : "No messages found"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs font-semibold"
                    style={{ color: "#047857" }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
            {chatGroups.map((group) => (
              <div key={group.label}>
                <p
                  className="text-xs font-semibold uppercase tracking-wider px-3 mb-2 mt-4 first:mt-0"
                  style={{ color: "#525252" }}
                >
                  {group.label}
                </p>
                {group.chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center gap-3 p-3 rounded-2xl ripple-container mb-1 relative"
                    style={{
                      background: chat.unread > 0
                        ? "rgba(4,120,87,0.05)"
                        : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => openChat(chat.id)}                      onContextMenu={(e) => {
                      e.preventDefault();
                      showSnackbar(
                        chat.unread > 0
                          ? "Marked as read"
                          : "Marked as unread",
                        "info"
                      );
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
                        style={{
                          background: chat.avatarBg,
                          color: "white",
                        }}
                      >
                        {chat.initial}
                      </div>
                      {chat.online && (
                        <div
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
                          style={{
                            background: "#22c55e",
                            borderColor: "#050505",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3
                          className={`text-sm truncate ${
                            chat.unread > 0 ? "font-bold text-white" : "font-semibold text-white"
                          }`}
                        >
                          {chat.name}
                          {chat.name === "Grace Njeri" && (
                            <span className="text-xs align-middle ml-1" style={{ color: "#047857" }}>
                              🛡️
                            </span>
                          )}
                        </h3>
                        <span
                          className={`text-xs ${
                            chat.unread > 0 ? "font-medium" : ""
                          }`}
                          style={{
                            color: chat.unread > 0 ? "#047857" : "#525252",
                          }}
                        >
                          {chat.time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className="text-xs truncate flex-1 pr-2"
                          style={{
                            color: chat.unread > 0 ? "#a3a3a3" : "#525252",
                          }}
                        >
                          {chat.lastMsg}
                        </p>
                        {chat.unread > 0 && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "#047857" }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              {chat.unread}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* VIEW 2: CHAT DETAIL */}
      {/* ============================================ */}
      {activeChat && (
        <div
          className="flex flex-col"
          style={{
            height: "100dvh",
            animation: chatClosing
              ? "slideOutRight 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards"
              : "slideInRight 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        >
          <div className="status-bar" style={{ background: "#0a0a0a", flexShrink: 0 }} />

          {/* Chat Header */}
          <header
            className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
            style={{
              background: "rgba(10,10,10,0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <button
              onClick={closeChat}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div
              className="flex items-center gap-3 flex-1 min-w-0"
            onClick={() => showSnackbar(`Viewing ${displayChat?.name || 'profile'}`, "info")}
            style={{ cursor: "pointer" }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: displayChat?.avatarBg || "linear-gradient(135deg, #047857, #059669)",
                    color: "white",
                  }}
                >
                  {displayChat?.initial || "?"}
                </div>
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                  style={{
                    background: displayChat?.online ? "#22c55e" : "#525252",
                    borderColor: "#0a0a0a",
                  }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {displayChat?.name || "User"}
                </h3>
                <p
                  className="text-xs"
                  style={{ color: displayChat?.online ? "#22c55e" : "#525252" }}
                >
                  {displayChat?.online ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const phone = otherParticipantPhone;
                if (phone) {
                  window.location.href = `tel:${phone}`;
                } else {
                  showSnackbar('Phone number not available', 'info');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Phone className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => openSheet("chat-menu")}
              className="w-10 h-10 rounded-full flex items-center justify-center ripple-container"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </header>

          {/* Property Context Card */}
          <div
            className="mx-4 mt-3 mb-2 p-3 rounded-2xl flex gap-3 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {activeChatData?.propertyImage ? (
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden">
                <img
                  src={activeChatData.propertyImage}
                  alt={activeChatData.propertyName || "Property"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.className = "w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold";
                    (e.target as HTMLImageElement).parentElement!.style.background = "linear-gradient(135deg, #047857, #059669)";
                  }}
                />
              </div>
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold"
                style={{
                  background: "linear-gradient(135deg, #047857, #059669)",
                  color: "white",
                }}
              >
                {displayChat?.name?.charAt(0) || "P"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#047857" }}
              >
                Discussing
              </p>
              <h4 className="text-sm font-bold text-white truncate">
                {displayChat?.property || activeChatData?.propertyName || "Property"}
              </h4>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>
                {displayChat?.propertyPrice || ""}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 self-center">
              <button
                onClick={() => router.push("/browse/explore")}
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <ExternalLink className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
              <button
                onClick={() => router.push("/browse/viewings")}
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(4,120,87,0.15)" }}
              >
                <Calendar className="w-4 h-4" style={{ color: "#047857" }} />
              </button>
            </div>
          </div>

          {/* Chat Search Overlay */}
          {showChatSearch && (
            <div
              className="px-4 pt-2 pb-1 flex-shrink-0"
              style={{
                animation: "slideInUp 0.2s ease",
              }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(4,120,87,0.3)",
                }}
              >
                <Search
                  className="w-4 h-4"
                  style={{ color: "#047857" }}
                />
                <input
                  type="text"
                  placeholder="Search in chat..."
                  className="bg-transparent outline-none text-sm flex-1"
                  style={{
                    color: "#e5e5e5",
                    caretColor: "#047857",
                  }}
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={closeChatSearch}
                  className="p-1"
                >
                  <X
                    className="w-4 h-4"
                    style={{ color: "#525252" }}
                  />
                </button>
              </div>
              {chatSearchQuery && (
                <p className="text-xs mt-2" style={{ color: "#525252" }}>
                  {
                    (displayChat?.messages || []).filter((m) =>
                      m.text
                        .toLowerCase()
                        .includes(chatSearchQuery.toLowerCase())
                    ).length
                  }{" "}
                  matches
                </p>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Date Divider */}
            <div className="flex items-center justify-center my-2">
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#525252",
                }}
              >
                Today
              </span>
            </div>

            {(displayChat?.messages || []).map((msg, i) => {
              const isHighlighted =
                chatSearchQuery &&
                msg.text
                  .toLowerCase()
                  .includes(chatSearchQuery.toLowerCase());
              const reaction = reactedMessages[i];
              // Check if the actual Firestore message has images
              const actualMsg = currentMessages[i];
              const hasImages = actualMsg?.attachments?.some((a) => a.type === "image");
              return (
                <div key={i} className="new-msg-anim relative">
                  {msg.type === "received" ? (
                    <>
                      <div
                        className="flex gap-2"
                        onClick={() => {
                          if (!showChatSearch) {
                            setSelectedMsgIndex(
                              selectedMsgIndex === i ? null : i
                            );
                          }
                        }}
                        style={{
                          cursor: "pointer",
                          userSelect: "none",
                          maxWidth: hasImages ? "280px" : "85%",
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                          style={{
                            background: "#047857",
                            color: "white",
                          }}
                        >
                          {displayChat?.initial || "?"}
                        </div>
                        <div className="relative" style={{ width: hasImages ? "100%" : "auto" }}>
                          <div
                            className={`bubble-received px-4 py-2.5 ${
                              isHighlighted ? "ring-2 ring-[#047857]/30" : ""
                            }`}
                          >
                            {msg.text && msg.text !== "📷 Photo" && <p className="text-sm mb-1">{msg.text}</p>}
                            {hasImages && actualMsg.attachments?.filter((a) => a.type === "image").map((att, j) => (
                              <img
                                key={j}
                                src={att.url}
                                alt={att.name}
                                className="w-full rounded-lg cursor-pointer"
                                style={{ maxHeight: "250px", objectFit: "cover" }}
                                onClick={(e) => { e.stopPropagation(); window.open(att.url, "_blank"); }}
                              />
                            ))}
                          </div>
                          {!hasImages && (
                            <p
                              className="text-xs mt-1 ml-2"
                              style={{ color: "#525252" }}
                            >
                              {msg.time}
                            </p>
                          )}
                          {/* Reaction on received messages */}
                          {reaction && (
                            <div
                              className="absolute -right-2 -bottom-1 text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "#1A1D21",
                                border:
                                  "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {reaction}
                            </div>
                          )}
                          {/* Reaction popover */}
                          {selectedMsgIndex === i && !showChatSearch && (
                            <div
                              className="absolute top-0 left-12 -translate-y-1/2 flex gap-0.5 px-2 py-1.5 rounded-xl z-10"
                              style={{
                                background: "#2A2D31",
                                border:
                                  "1px solid rgba(255,255,255,0.1)",
                                boxShadow:
                                  "0 4px 16px rgba(0,0,0,0.4)",
                              }}
                            >
                              {reactionEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReact(emoji, i);
                                  }}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform active:scale-125 ${
                                    reaction === emoji
                                      ? "bg-[#047857]/20 scale-110"
                                      : ""
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Click outside to close reactions */}
                      {selectedMsgIndex === i && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setSelectedMsgIndex(null)}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <div
                        className="flex gap-2 ml-auto flex-row-reverse"
                        onClick={() => {
                          if (!showChatSearch) {
                            setSelectedMsgIndex(
                              selectedMsgIndex === i ? null : i
                            );
                          }
                        }}
                        style={{
                          cursor: "pointer",
                          userSelect: "none",
                          maxWidth: hasImages ? "280px" : "85%",
                        }}
                      >
                        <div style={{ width: hasImages ? "100%" : "auto" }}>
                          <div
                            className={`bubble-sent px-4 py-2.5 ${
                              isHighlighted ? "ring-2 ring-[#047857]/30" : ""
                            }`}
                          >
                            {msg.text && msg.text !== "📷 Photo" && <p className="text-sm mb-1">{msg.text}</p>}
                            {hasImages && actualMsg.attachments?.filter((a) => a.type === "image").map((att, j) => (
                              <img
                                key={j}
                                src={att.url}
                                alt={att.name}
                                className="w-full rounded-lg cursor-pointer"
                                style={{ maxHeight: "250px", objectFit: "cover" }}
                                onClick={(e) => { e.stopPropagation(); window.open(att.url, "_blank"); }}
                              />
                            ))}
                          </div>
                          {!hasImages && (
                            <p
                              className="text-xs mt-1 mr-2 text-right flex items-center justify-end gap-1"
                              style={{ color: "#525252" }}
                            >
                              {msg.time}
                              <CheckCheck
                                className="w-3.5 h-3.5 inline"
                                style={{ color: "#047857" }}
                              />
                            </p>
                          )}
                          {/* Reaction on sent messages */}
                          {reaction && (
                            <div
                              className="absolute -right-2 -bottom-1 text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                background: "#1A1D21",
                                border:
                                  "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {reaction}
                            </div>
                          )}
                          {/* Sent message actions (copy, delete) */}
                          {selectedMsgIndex === i && !showChatSearch && (
                            <div
                              className="absolute top-0 right-0 -translate-y-full -mt-1 flex gap-1 px-1.5 py-1 rounded-xl z-10"
                              style={{
                                background: "#2A2D31",
                                border:
                                  "1px solid rgba(255,255,255,0.1)",
                                boxShadow:
                                  "0 4px 16px rgba(0,0,0,0.4)",
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMessageAction(
                                    "copy",
                                    i
                                  );
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:scale-95"
                              >
                                <Copy
                                  className="w-3.5 h-3.5"
                                  style={{
                                    color: "#a3a3a3",
                                  }}
                                />
                                <span
                                  className="text-xs"
                                  style={{
                                    color: "#a3a3a3",
                                  }}
                                >
                                  Copy
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMessageAction(
                                    "delete",
                                    i
                                  );
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg active:scale-95"
                              >
                                <Trash2
                                  className="w-3.5 h-3.5"
                                  style={{
                                    color: "#ef4444",
                                  }}
                                />
                                <span
                                  className="text-xs"
                                  style={{
                                    color: "#ef4444",
                                  }}
                                >
                                  Delete
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Click outside to close */}
                      {selectedMsgIndex === i && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setSelectedMsgIndex(null)}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 max-w-[85%]">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "#047857", color: "white" }}
                >
                  {displayChat?.initial || "?"}
                </div>
                <div className="bubble-received px-4 py-3 flex gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Suggestions */}
          {showQuickReplies && !chatInput.trim() && (
            <div
              className="px-4 py-3 flex-shrink-0 overflow-x-auto browse-scroll-hidden"
              style={{
                background: "#1A1D21",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                animation: "slideInUp 0.2s ease",
              }}
            >
              <div className="flex gap-2" style={{ minWidth: "max-content" }}>
                <div className="flex items-center gap-2 mr-1 pr-3 border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#047857" }} />
                  <span className="text-xs font-semibold" style={{ color: "#047857" }}>Quick</span>
                </div>
                {autoReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => insertQuickReply(reply)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap ripple-container"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "#e5e5e5",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {reply.length > 40 ? reply.slice(0, 40) + "..." : reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reply Context Bar */}
          {replyContext && (
            <div
              className="px-4 py-2 flex-shrink-0"
              style={{
                background: "#1A1D21",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1 h-8 rounded-full"
                  style={{ background: "#047857" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#047857" }}
                  >
                    Replying
                  </p>
                  <p className="text-xs truncate" style={{ color: "#a3a3a3" }}>
                    {replyContext}
                  </p>
                </div>
                <button
                  onClick={() => setReplyContext(null)}
                  className="p-1"
                >
                  <X className="w-4 h-4" style={{ color: "#525252" }} />
                </button>
              </div>
            </div>
          )}

          {/* Chat Input Bar */}
          <div
            className="px-4 py-3 flex items-end gap-2 flex-shrink-0"
            style={{
              background: "#0a0a0a",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            <button
              onClick={() => openSheet("attach")}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ripple-container"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Plus className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </button>
            <div
              className="flex-1 flex items-end gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: "44px",
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={chatInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="bg-transparent outline-none text-sm flex-1 resize-none max-h-24"
                style={{ color: "#e5e5e5", caretColor: "#047857" }}
                placeholder="Type a message..."
                onFocus={() => setShowQuickReplies(true)}
                onBlur={() => setTimeout(() => setShowQuickReplies(false), 200)}
              />
            </div>
            <button
              onClick={chatInput.trim() ? sendMessage : undefined}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ripple-container transition-all duration-200"
              style={{
                background: chatInput.trim() ? "#047857" : "rgba(255,255,255,0.05)",
              }}
            >
              {chatInput.trim() ? (
                <Send className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5" style={{ color: "#a3a3a3" }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* BOTTOM SHEET: SEARCH MESSAGES */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${sheetOpen === "search-msg" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div
        className={`bottom-sheet ${sheetOpen === "search-msg" ? "active" : ""}`}
      >
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(4,120,87,0.3)",
            }}
          >
            <Search className="w-5 h-5" style={{ color: "#047857" }} />
            <input
              type="text"
              placeholder="Search by name or property..."
              className="bg-transparent outline-none text-sm flex-1"
              style={{ color: "#e5e5e5", caretColor: "#047857" }}
              autoFocus
            />
          </div>
        </div>
        <div className="px-3 pb-3">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#525252" }}
          >
            Recent
          </p>
          <div className="space-y-1">
            {enrichedChats.slice(0, 2).map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  closeSheet();
                  openChat(chat.id);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl ripple-container"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <Clock className="w-4 h-4" style={{ color: "#525252" }} />
                <span className="text-sm text-white">{chat.property}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="h-6" />
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: ATTACHMENT */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${sheetOpen === "attach" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div className={`bottom-sheet ${sheetOpen === "attach" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-3">
          <h3 className="text-lg font-bold text-white">Attach</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 px-3 pb-8">
          {attachOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => handleAttach(opt.label)}
                className="flex flex-col items-center gap-2 ripple-container p-2 rounded-xl"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: opt.bg }}
                >
                  <Icon className="w-6 h-6" style={{ color: opt.color }} />
                </div>
                <span className="text-xs" style={{ color: "#a3a3a3" }}>
                  {opt.label === "M-Pesa" ? "M-Pesa" : opt.label}
                </span>
              </button>
            );
          })}
        </div>
        {uploadingImage && (
          <div className="flex items-center justify-center pb-6">
            <div className="spinner" />
            <span className="text-sm ml-3" style={{ color: "#a3a3a3" }}>Uploading image...</span>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* BOTTOM SHEET: CHAT MENU */}
      {/* ============================================ */}
      <div
        className={`bottom-sheet-overlay ${sheetOpen === "chat-menu" ? "active" : ""}`}
        onClick={closeSheet}
      />
      <div className={`bottom-sheet ${sheetOpen === "chat-menu" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-3 pb-8">
          {chatMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleMenuAction(item.label)}
                className="w-full flex items-center gap-4 p-3 rounded-xl ripple-container"
              >
                <Icon className="w-5 h-5" style={{ color: item.color }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: item.color === "#ef4444" ? "#ef4444" : "white" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

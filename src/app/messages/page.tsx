"use client";

import { useState, useRef, useEffect } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  LayoutDashboard,
  List,
  Menu,
  ChevronRight,
  Check,
  CheckCheck,
  X,
  Info,
  Phone,
  MessageCircle,
  Smartphone,
  Camera,
  Image,
  FileText,
  MapPin,
  FileSignature,
  Receipt,
  Contact,
  CalendarPlus,
  User,
  BellOff,
  Archive,
  Trash2,
  MoreVertical,
  ArrowLeft,
  Plus,
  Send,
  Layers,
  MessageSquare,
  Settings,
  CalendarDays,
  Clock,
  Edit3,
  X as XIcon,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToConversations,
  listenToMessages,
  sendMessage as sendMessageFS,
  markConversationRead,
  createConversation,
  clearConversationMessages,
  archiveConversation,
  unarchiveConversation,
  toggleMuteConversation,
  type ConversationData,
  type MessageData,
} from "../../lib/conversations";
import { Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { scheduleViewing } from "../../lib/viewings";
import { uploadPhoto, takePhoto, openFilePicker } from "@/lib/upload";
import { listenToNotifications } from "../../lib/notifications";
import type { NotificationData } from "../../lib/notifications";
import { db } from "../../lib/firebase";
import { phoneVariants } from "../../lib/phone";

type SnackbarType = "success" | "error" | "info";

interface EnrichedChat {
  id: string;
  initials: string;
  name: string;
  color: string;
  unit: string;
  type: "tenants" | "prospects" | "archived";
  time: string;
  preview: string;
  unread: number;
  phone: string;
  propertyImage?: string;
}

interface LocalMessage {
  text: string;
  time: string;
  sent: boolean;
  read?: boolean;
}

function formatTimeAgo(date: Date | null | undefined): string {
  if (!date) return "";
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

export default function MessagesPage() {
  const router = useRouter();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("more");
  const [filterTab, setFilterTab] = useState("all");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Chat State ----
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Auth ----
  const { user } = useAuth();
  const uid = user?.uid || "";

  // ---- Form Loading ----
  const [formLoading, setFormLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ---- Firestore State ----
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [currentMessages, setCurrentMessages] = useState<MessageData[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // ---- Listen to conversations ----
  useEffect(() => {
    if (!uid) { setConvsLoading(false); return; }
    const unsub = listenToConversations(uid, (data) => {
      setConversations(data);
      setConvsLoading(false);
    }, (err) => {
      console.error("Conversations error:", err);
      setConvsLoading(false);
    });
    return () => unsub();
  }, [uid]);

  // ---- Listen to messages for active chat ----
  useEffect(() => {
    if (!activeChatId) { setCurrentMessages([]); return; }
    setMessagesLoading(true);
    const unsub = listenToMessages(activeChatId, (data) => {
      setCurrentMessages(data);
      setMessagesLoading(false);
    }, (err) => {
      console.error("Messages error:", err);
      setMessagesLoading(false);
    });
    if (uid) markConversationRead(activeChatId, uid);
    return () => unsub();
  }, [activeChatId, uid]);

  // ---- Listen to notifications ----
  useEffect(() => {
    if (!uid) return;
    const unsub = listenToNotifications(
      uid,
      (data) => {
        setNotifications(data);
      },
      (err) => {
        console.error("Notifications error:", err);
      }
    );
    return () => unsub();
  }, [uid]);

  // ---- Build enriched chats from conversations ----
  const enrichedChats: EnrichedChat[] = conversations.map((conv) => {
    const otherId = conv.participants.find((p) => p !== uid) || "";
    const otherName = conv.participantNames[otherId] || "User";
    const initials = otherName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const color = ["#047857", "#eab308", "#3b82f6", "#a855f7", "#ec4899", "#f97316"][conv.participants.indexOf(otherId) % 6];
    const unread = conv.unreadCount?.[uid] || 0;
    const lastTime = conv.lastMessageTime ? formatTimeAgo(conv.lastMessageTime.toDate()) : "";
    // Determine type based on other participant's role (simple heuristic)
    const type: "tenants" | "prospects" | "archived" = conv.unitName ? "tenants" : "prospects";
    return {
      id: conv.id,
      initials,
      name: otherName,
      color,
      unit: conv.propertyName ? `${conv.unitName || "Unit"} — ${conv.propertyName}` : "Conversation",
      type,
      time: lastTime,
      preview: conv.lastMessage || "",
      unread,
      phone: "",
      // Include propertyImage for display in the chat header
      propertyImage: conv.propertyImage || "",
    };
  });

  const filteredChats = enrichedChats
    .filter((c) => filterTab === "all" || c.type === filterTab)
    .filter((c) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.unit.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
      );
    });

  const chatCounts = {
    all: enrichedChats.length,
    tenants: enrichedChats.filter((c) => c.type === "tenants").length,
    prospects: enrichedChats.filter((c) => c.type === "prospects").length,
    archived: 0,
  };

  const tabFilters = [
    { key: "all", label: "All", count: chatCounts.all },
    { key: "tenants", label: "Tenants", count: chatCounts.tenants },
    { key: "prospects", label: "Prospects", count: chatCounts.prospects },
  ];

  // ---- Enriched Chat state ----
  const [currentChat, setCurrentChat] = useState<ConversationData | null>(null);

  // ---- Open Chat ----
  const openChat = (chat: EnrichedChat) => {
    setChatOpen(true);
    setActiveChatId(chat.id);
    const fullConv = conversations.find((c) => c.id === chat.id) || null;
    setCurrentChat(fullConv);
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveChatId(null);
    setCurrentChat(null);
    setCurrentMessages([]);
  };

  // ---- Send Message ----
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !activeChatId || !uid) return;

    // Optimistically add the message locally so it appears instantly
    setCurrentMessages((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        conversationId: activeChatId,
        senderId: uid,
        text,
        read: false,
        attachments: [],
        createdAt: Timestamp.fromDate(new Date()),
      },
    ]);

    // Write to Firestore — the listener will replace currentMessages when it fires
    sendMessageFS(activeChatId, uid, text);
    setInputText("");
  };

  // ---- Handle Enter key ----
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ---- Send Image ----
  const handleSendImage = async (source: "camera" | "gallery") => {
    if (uploadingImage) return;
    if (!activeChatId || !uid) {
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
      const result = await uploadPhoto(file, "chat-images", uid);
      await sendMessageFS(activeChatId, uid, "📷 Photo", [{
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

  // ---- Snackbar ----
  useEffect(() => {
    if (snackbar.show) {
      setSnackbarVisible(true);
      setSnackbarAnimClass("show");
    } else {
      setSnackbarAnimClass("hide");
      const timeout = setTimeout(() => {
        setSnackbarVisible(false);
        setSnackbarAnimClass("");
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [snackbar.show]);

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar({ show: false, message: "", type: "info" });
    }, 3000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  // ---- Sheet Management ----
  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Schedule Viewing State ----
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleStart, setScheduleStart] = useState("10:00");
  const [scheduleEnd, setScheduleEnd] = useState("10:30");

  // ---- New Chat Form State ----
  const [newChatProp, setNewChatProp] = useState("");
  const [newChatUnit, setNewChatUnit] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [newChatTenantId, setNewChatTenantId] = useState("");
  const [newChatTenantName, setNewChatTenantName] = useState("");
  const [newChatLookupLoading, setNewChatLookupLoading] = useState(false);
  const newChatPhoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounced tenant phone lookup ----
  useEffect(() => {
    if (newChatPhoneTimer.current) clearTimeout(newChatPhoneTimer.current);
    const digits = newChatPhone.replace(/\D/g, "");
    if (digits.length < 9) {
      setNewChatTenantId("");
      setNewChatTenantName("");
      setNewChatLookupLoading(false);
      return;
    }
    setNewChatLookupLoading(true);
    newChatPhoneTimer.current = setTimeout(async () => {
      try {
        const variants = phoneVariants(newChatPhone);
        if (variants.length === 0) {
          setNewChatTenantId("");
          setNewChatTenantName("");
          setNewChatLookupLoading(false);
          return;
        }
        const q = query(collection(db, "users"), where("phone", "in", variants.slice(0, 10)));
        const snap = await getDocs(q);
        if (snap.empty) {
          setNewChatTenantId("");
          setNewChatTenantName("");
        } else {
          const userData = snap.docs[0].data();
          setNewChatTenantId(snap.docs[0].id);
          setNewChatTenantName(userData.displayName || userData.name || userData.phone || "");
        }
      } catch {
        setNewChatTenantId("");
        setNewChatTenantName("");
      }
      setNewChatLookupLoading(false);
    }, 600);
    return () => {
      if (newChatPhoneTimer.current) clearTimeout(newChatPhoneTimer.current);
    };
  }, [newChatPhone]);

  const resetNewChatForm = () => {
    setNewChatProp(""); setNewChatUnit(""); setNewChatName("");
    setNewChatPhone(""); setNewChatMessage("");
    setNewChatTenantId("");
    setNewChatTenantName("");
  };

  // ---- Form Handler ----
  const handleForm = async (id: string) => {
    setFormLoading(id);
    try {
      if (id === "new") {
        if (!newChatName.trim()) { showSnackbar("Recipient name is required", "error"); setFormLoading(null); return; }
        if (!newChatMessage.trim()) { showSnackbar("Message is required", "error"); setFormLoading(null); return; }
        const otherId = newChatTenantId || `${newChatName.replace(/\s+/g, "").toLowerCase()}@temp`;
        const convId = await createConversation({
          participants: [uid, otherId],
          participantNames: { [uid]: user?.displayName || "Landlord", [otherId]: newChatName },
          propertyName: newChatProp || undefined,
          unitName: newChatUnit || undefined,
          firstMessage: newChatMessage,
          senderId: uid,
        });
        setFormLoading(null);
        resetNewChatForm();
        closeSheet();
        setTimeout(() => {
          showSnackbar("Message sent! 📨", "success");
          openChat({
            id: convId, initials: newChatName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2),
            name: newChatName, color: "#047857", unit: newChatProp || "", type: "prospects",
            time: "Just now", preview: newChatMessage, unread: 0, phone: newChatPhone,
          });
        }, 300);
      } else if (id === "clear") {
        if (!activeChatId) { showSnackbar("No chat selected", "error"); setFormLoading(null); return; }
        await clearConversationMessages(activeChatId);
        setFormLoading(null);
        closeSheet();
        setCurrentMessages([]);
        setTimeout(() => showSnackbar("Chat cleared", "error"), 300);
      }
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Something went wrong", "error");
    }
  };

  // ---- Ripple Effect ----
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest(".ripple-container") as HTMLElement | null;
      if (!container) return;
      const ripple = document.createElement("span");
      ripple.classList.add("ripple");
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ---- Snackbar Icon ----
  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
            <Check className="w-3.5 h-3.5" style={{ color: "#047857" }} />
          </div>
        );
      case "error":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
          </div>
        );
      case "info":
        return (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
            <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          </div>
        );
    }
  };

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Messages</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{enrichedChats.length} conversations</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openSheet("search")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Search className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
              <button onClick={() => openSheet("newChat")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Edit3 className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex overflow-x-auto px-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {tabFilters.map((f) => (
              <div
                key={f.key}
                className={`msg-tab ${filterTab === f.key ? "active" : ""}`}
                onClick={(e) => {
                  setFilterTab(f.key);
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  showSnackbar(`Showing ${f.label.toLowerCase()} chats`, "info");
                }}
              >
                {f.label} <span className="tab-count">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content">
          <div id="chat-list" className="pb-4">
            {filteredChats.map((chat, i) => (
              <div
                key={i}
                className={`chat-item animate-in ${chat.unread > 0 ? "unread" : ""}`}
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                data-type={chat.type}
                onClick={() => openChat(chat)}
              >
                <div className="chat-avatar" style={{ background: `${chat.color}1e`, color: chat.color }}>
                  {chat.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${chat.unread > 0 ? "font-semibold" : "font-medium"} text-white`}>
                      {chat.name}
                    </p>
                    <span className="text-xs" style={{ color: chat.unread > 0 ? "#047857" : "#525252" }}>
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: chat.unread > 0 ? "#a3a3a3" : "#525252" }}>
                    {chat.unit}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs truncate ${chat.unread > 0 ? "font-medium text-white" : ""}`} style={{ color: chat.unread > 0 ? undefined : "#a3a3a3" }}>
                      {chat.preview}
                    </p>
                    {chat.unread > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: "#047857", fontSize: "9px", fontWeight: 700 }}>
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BottomNavAndMenu />
      </div>

      {/* =============================================== */}
      {/* ALL SHEETS */}
      {/* =============================================== */}

      {/* SEARCH */}
      <div className={`sheet-overlay ${activeSheet === "search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "search" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search messages..." autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent</h4>
          <div className="space-y-1">
            {enrichedChats.slice(0, 3).map((c, i) => (
              <button
                key={i}
                onClick={() => { closeSheet(); openChat(c); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1e` }}>
                  <span className="text-xs font-bold" style={{ color: c.color }}>{c.initials}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{c.unit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* NEW CHAT */}
      <div className={`sheet-overlay ${activeSheet === "newChat" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "newChat" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">New Message</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Property</label>
              <select className="android-select" value={newChatProp} onChange={(e) => setNewChatProp(e.target.value)}>
                <option value="">Select property</option>
                {[...new Set(conversations.map(c => c.propertyName).filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Unit</label>
              <select className="android-select" value={newChatUnit} onChange={(e) => setNewChatUnit(e.target.value)}>
                <option value="">Select unit</option>
                <option value="">—</option>
              </select>
            </div>
            <div className="input-group">
              <input type="text" className="android-input" placeholder=" " value={newChatName} onChange={(e) => setNewChatName(e.target.value)} />
              <label>Recipient Name</label>
            </div>
            <div className="input-group">
              <input type="tel" className="android-input" placeholder=" " style={{ paddingLeft: "60px", paddingRight: newChatTenantId || newChatLookupLoading ? "140px" : "16px" }} value={newChatPhone} onChange={(e) => setNewChatPhone(e.target.value)} />
              <label style={{ left: "60px" }}>Phone</label>
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#a3a3a3" }}>+254</span>
              {newChatLookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="spinner" style={{ width: "16px", height: "16px" }} />
                </div>
              )}
              {newChatTenantId && !newChatLookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2" style={{ maxWidth: "130px" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#047857" }} />
                  <div className="flex flex-col items-end leading-tight overflow-hidden">
                    <span className="text-[10px] font-semibold text-white truncate w-full text-right">{newChatTenantName}</span>
                    <span className="text-[9px] font-medium" style={{ color: "#047857" }}>Tenant Found</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Message</label>
              <textarea className="android-input" style={{ minHeight: "80px", borderRadius: "14px" }} placeholder="Type your message..." value={newChatMessage} onChange={(e) => setNewChatMessage(e.target.value)} />
            </div>
            <button onClick={() => handleForm("new")} className="btn-primary ripple-container" disabled={formLoading === "new"}>
              {formLoading === "new" ? <div className="spinner mx-auto" /> : <span>Send Message</span>}
            </button>
          </div>
        </div>
      </div>

      {/* CHAT OPTIONS */}
      <div className={`sheet-overlay ${activeSheet === "chatOptions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "chatOptions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2"><h3 className="text-base font-bold text-white">Chat Options</h3></div>
        <div className="px-3 pb-8">
          <button onClick={() => { closeSheet(); router.push('/dashboard'); }} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <User className="w-5 h-5" style={{ color: "#3b82f6" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">View Profile</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Tenant details & history</p>
            </div>
          </button>
          <button onClick={async () => { closeSheet(); if (activeChatId && uid) { await toggleMuteConversation(activeChatId, uid, true); showSnackbar("Muted for 8 hours", "info"); } }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.12)" }}>
              <BellOff className="w-5 h-5" style={{ color: "#eab308" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Mute Notifications</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Temporarily silence alerts</p>
            </div>
          </button>
          <button onClick={async () => { closeSheet(); if (activeChatId) { await archiveConversation(activeChatId); showSnackbar("Chat archived", "info"); } }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.12)" }}>
              <Archive className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Archive Chat</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Move to archived</p>
            </div>
          </button>
          <button onClick={() => { closeSheet(); setTimeout(() => openSheet("clearChat"), 300); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
              <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Clear Chat</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>Delete all messages</p>
            </div>
          </button>
        </div>
      </div>

      {/* CALL OPTIONS */}
      <div className={`sheet-overlay ${activeSheet === "callOptions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "callOptions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-base font-bold text-white mb-4">Contact</h3>
          <div className="space-y-2">
            <a href={`tel:${currentChat?.participants?.[0] as string || '254712345678'}`} className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.12)" }}>
                <Phone className="w-5 h-5" style={{ color: "#047857" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Call</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>+254 712 345 678</p>
              </div>
            </a>
            <a href={`https://wa.me/254712345678`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,211,102,0.12)" }}>
                <MessageCircle className="w-5 h-5" style={{ color: "#25D366" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">WhatsApp</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>Send a WhatsApp message</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ATTACH */}
      <div className={`sheet-overlay ${activeSheet === "attach" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "attach" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-3">
          <h3 className="text-base font-bold text-white mb-4">Attach</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { icon: Camera, color: "#047857", bg: "rgba(4,120,87,0.12)", label: "Camera" },
              { icon: Image, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Gallery" },
              { icon: FileText, color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "Document" },
              { icon: MapPin, color: "#a855f7", bg: "rgba(168,85,247,0.12)", label: "Location" },
            ].map((item, i) => (
              <div key={i} className="attach-item" onClick={async () => {
                closeSheet();
                if (item.label === "Camera" || item.label === "Gallery") {
                  await handleSendImage(item.label === "Camera" ? "camera" : "gallery");
                } else {
                  showSnackbar(`${item.label} coming soon`, "info");
                }
              }}>
                <div className="attach-icon" style={{ background: item.bg }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-xs" style={{ color: "#a3a3a3" }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: FileSignature, color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "Lease" },
              { icon: Receipt, color: "#ec4899", bg: "rgba(236,72,153,0.12)", label: "Receipt" },
              { icon: Contact, color: "#06b6d4", bg: "rgba(6,182,212,0.12)", label: "Contact" },
              { icon: CalendarPlus, color: "#047857", bg: "rgba(4,120,87,0.12)", label: "Schedule" },
            ].map((item, i) => (
              <div key={i} className="attach-item" onClick={() => { 
                closeSheet(); 
                if (item.label === "Schedule") {
                  setTimeout(() => openSheet("scheduleViewing"), 300);
                } else {
                  showSnackbar(`${item.label} coming soon`, "info");
                }
              }}>
                <div className="attach-icon" style={{ background: item.bg }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <span className="text-xs" style={{ color: "#a3a3a3" }}>{item.label}</span>
              </div>
            ))}
          </div>
          {uploadingImage && (
            <div className="flex items-center justify-center py-4 mt-2">
              <div className="spinner" />
              <span className="text-sm ml-3" style={{ color: "#a3a3a3" }}>Uploading image...</span>
            </div>
          )}
        </div>
      </div>

      {/* CLEAR CHAT */}
      <div className={`sheet-overlay ${activeSheet === "clearChat" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "clearChat" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Trash2 className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Clear Chat?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>All messages will be permanently deleted. This cannot be undone.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button onClick={() => handleForm("clear")} className="btn-danger flex-1" style={{ padding: "14px" }} disabled={formLoading === "clear"}>
              {formLoading === "clear" ? <div className="spinner mx-auto" /> : <span>Clear</span>}
            </button>
          </div>
        </div>
      </div>

      {/* SCHEDULE VIEWING */}
      <div className={`sheet-overlay ${activeSheet === "scheduleViewing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "scheduleViewing" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-3">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Schedule Viewing</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.12)" }}>
                <span className="text-sm font-bold" style={{ color: "#047857" }}>{(enrichedChats.find((c) => c.id === activeChatId)?.initials) || "?"}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{enrichedChats.find((c) => c.id === activeChatId)?.name || "Chat"}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{enrichedChats.find((c) => c.id === activeChatId)?.unit || ""}</p>
              </div>
            </div>
            <div className="input-group">
              <input type="date" className="android-input" placeholder=" " value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Date</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Start Time</label>
              </div>
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>End Time</label>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!uid || !activeChatId) return;
                setFormLoading("schedule");
                try {
                  const chat = enrichedChats.find(c => c.id === activeChatId);
                  const conv = conversations.find(c => c.id === activeChatId);
                  await scheduleViewing(uid, {
                    propertyId: conv?.propertyId || "",
                    propertyName: conv?.propertyName || "",
                    unitId: conv?.unitId || "",
                    unitName: conv?.unitName || "",
                    tenantName: chat?.name || "Tenant",
                    tenantPhone: chat?.phone || "",
                    date: scheduleDate,
                    startTime: scheduleStart,
                    endTime: scheduleEnd,
                    duration: "30 min",
                    notes: `Scheduled from chat with ${chat?.name || ""}`,
                  });
                  setFormLoading(null);
                  closeSheet();
                  setTimeout(() => showSnackbar("Viewing invitation sent! 📅", "success"), 300);
                } catch (err: any) {
                  setFormLoading(null);
                  showSnackbar(err?.message || "Failed to schedule", "error");
                }
              }}
              className="btn-primary ripple-container mt-2"
              disabled={formLoading === "schedule"}
            >
              {formLoading === "schedule" ? <div className="spinner mx-auto" /> : <span>Send Invitation</span>}
            </button>
          </div>
        </div>
      </div>

      {/* MORE MENU */}
      <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">More</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules &amp; settings</p>
        </div>
        <div className="px-3 pb-8">
          {[
            { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
            { icon: CalendarDays, label: "Viewings", desc: "8 viewing requests", color: "#eab308", path: "/viewings" },
            { icon: CalendarDays, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/calendar" },
            { icon: MessageSquare, label: "Messages", desc: "6 conversations", color: "#a855f7", path: "/messages" },
            { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => {
                closeSheet();
                if (item.path) {
                  router.push(item.path);
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.08)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{item.desc}</p>
              </div>
              {item.path && <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* ====== CHAT FULL-SCREEN OVERLAY ====== */}
      {chatOpen && activeChatId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: "#050505" }}>
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: "#1A1D21", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={closeChat} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
        <ArrowLeft className="w-5 h-5" style={{ color: "#e5e5e5" }} />
      </button>
      {(() => {
        const chatData = enrichedChats.find((c) => c.id === activeChatId);
        if (chatData?.propertyImage) {
          return (
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
              <img
                src={chatData.propertyImage}
                alt={chatData.unit || "Property"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          );
        }
        return (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(4,120,87,0.15)" }}>
            <span className="text-sm font-bold" style={{ color: "#047857" }}>{chatData?.initials || "?"}</span>
          </div>
        );
      })()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{enrichedChats.find((c) => c.id === activeChatId)?.name || "Chat"}</p>
        <p className="text-xs" style={{ color: "#a3a3a3" }}>{enrichedChats.find((c) => c.id === activeChatId)?.unit || ""}</p>
      </div>
            <button onClick={() => openSheet("callOptions")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Phone className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
            <button onClick={() => openSheet("chatOptions")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <MoreVertical className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {messagesLoading && currentMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="spinner mx-auto mb-4" />
                <p className="text-sm" style={{ color: "#525252" }}>Loading messages...</p>
              </div>
            )}
            {!messagesLoading && currentMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <MessageSquare className="w-10 h-10 mb-3" style={{ color: "#525252" }} />
                <p className="text-sm" style={{ color: "#a3a3a3" }}>No messages yet. Start a conversation!</p>
              </div>
            )}
            {currentMessages.map((msg, i) => {
              const isSent = msg.senderId === uid;
              const time = msg.createdAt?.toDate ? formatTime(msg.createdAt.toDate()) : "";
              const hasImages = msg.attachments?.some((a) => a.type === "image");
              return (
              <div key={msg.id || i} className={`flex ${isSent ? "justify-end" : "justify-start"}`} style={{ animation: "slideInUp 0.2s ease" }}>
                <div className={`chat-bubble ${isSent ? "sent" : "received"}`} style={{ maxWidth: hasImages ? "280px" : "80%" }}>
                  {msg.text && msg.text !== "📷 Photo" && <p className="text-sm mb-1">{msg.text}</p>}
                  {msg.attachments?.filter((a) => a.type === "image").map((att, j) => (
                    <img
                      key={j}
                      src={att.url}
                      alt={att.name}
                      className="w-full rounded-lg cursor-pointer"
                      style={{ maxHeight: "300px", objectFit: "cover" }}
                      onClick={() => window.open(att.url, "_blank")}
                    />
                  ))}
                  {!hasImages && (
                    <div className="time">
                      {time}
                      {isSent && (
                        <CheckCheck className="w-3.5 h-3.5 inline" style={{ opacity: msg.read ? 1 : 0.5 }} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );})}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex items-end gap-2 p-3 flex-shrink-0" style={{ background: "#1A1D21", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <button onClick={() => openSheet("attach")} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mb-1" style={{ background: "rgba(255,255,255,0.04)" }}>
              <Plus className="w-5 h-5" style={{ color: "#a3a3a3" }} />
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                className="w-full py-2.5 px-4 rounded-2xl text-sm resize-none"
                rows={1}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e5e5e5", outline: "none", maxHeight: "100px", caretColor: "#047857" }}
                placeholder="Message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              onClick={sendMessage}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mb-1"
              style={{ background: inputText.trim() ? "linear-gradient(135deg,#047857,#059669)" : "rgba(255,255,255,0.08)" }}
              disabled={!inputText.trim()}
            >
              <Send className="w-4.5 h-4.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ====== SNACKBAR ====== */}
      {snackbarVisible && (
        <div className={`snackbar ${snackbarAnimClass}`}>
          <div className="flex items-center gap-3">
            <div>{snackbarIcon()}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{snackbar.message}</p>
            </div>
            <button onClick={hideSnackbar} className="p-1">
              <X className="w-4 h-4" style={{ color: "#525252" }} />
            </button>
          </div>
        </div>
      )}
    </div>
      </AuthGuard>
  );
}

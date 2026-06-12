"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  MessageCircle,
  List,
  Layers,
  Plus,
  Check,
  CheckCheck,
  X,
  Info,
  ArrowUpDown,
  Phone,
  Smartphone,
  Reply,
  CalendarDays,
  CalendarPlus,
  Wrench,
  MoreHorizontal,
  Mail,
  Archive,
  XCircle,
  User,
  Menu,
  ChevronRight,
  Clock,
  BadgeCheck,
  Megaphone,
  MessageSquareWarning,
  DoorOpen,
  MessageSquare,
  Settings,
  X as XIcon,
} from "lucide-react";

import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../AuthContext";
import {
  listenToInquiries,
  markInquiryRead,
  markInquiryProgress,
  markInquiryResponded,
  archiveInquiry,
  replyToInquiry,
  deleteInquiry,
  type InquiryData,
} from "../../lib/inquiries";
import { Timestamp } from "firebase/firestore";

type SnackbarType = "success" | "error" | "info";

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
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function formatCreatedAt(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  return formatTimeAgo(ts.toDate());
}

export default function InquiriesPage() {
  const router = useRouter();

  // ---- Tab State ----
  const [activeTab, setActiveTab] = useState("more");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  // ---- Active Tab Filter ----
  const [activeFilter, setActiveFilter] = useState("all");

  // ---- Sort Label ----
  const [sortLabel, setSortLabel] = useState("Newest First");

  // ---- Search Text ----
  const [searchText, setSearchText] = useState("");

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  // ---- Loading states ----
  const [formLoading, setFormLoading] = useState<string | null>(null);

  // ---- Auth ----
  const { user } = useAuth();

  // ---- Firestore State ----
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);

  // ---- Firestore Listener ----
  useEffect(() => {
    if (!user) { setInquiriesLoading(false); return; }
    const unsub = listenToInquiries(
      user.uid,
      (data) => {
        setInquiries(data);
        setInquiriesLoading(false);
      },
      (err) => {
        console.error("Error loading inquiries:", err);
        setInquiriesLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  // ---- Inquiries data (now from Firestore) ----

  const sortedInquiries = [...inquiries].sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
    const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
    switch (sortLabel) {
      case "Oldest First": return aTime - bTime;
      case "By Property": return (a.propertyName || "").localeCompare(b.propertyName || "");
      case "Unread First": {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return bTime - aTime;
      }
      default: return bTime - aTime; // "Newest First"
    }
  });

  const filteredInquiries = sortedInquiries
    .filter((inq) => {
      if (activeFilter === "all") return true;
      return inq.status === activeFilter;
    })
    .filter((inq) => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        (inq.tenantName || "").toLowerCase().includes(q) ||
        (inq.propertyName || "").toLowerCase().includes(q) ||
        (inq.unitName || "").toLowerCase().includes(q) ||
        (inq.message || "").toLowerCase().includes(q)
      );
    });

  // ---- Computed Stats ----
  const inquiryCount = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === "new").length,
    progress: inquiries.filter(i => i.status === "progress").length,
    responded: inquiries.filter(i => i.status === "responded").length,
    archived: inquiries.filter(i => i.status === "archived").length,
  };

  const tabFilters = [
    { key: "all", label: "All", count: inquiryCount.total },
    { key: "new", label: "New", count: inquiryCount.new },
    { key: "progress", label: "In Progress", count: inquiryCount.progress },
    { key: "responded", label: "Responded", count: inquiryCount.responded },
    { key: "archived", label: "Archived", count: inquiryCount.archived },
  ];

  const stats = [
    { label: "New", value: String(inquiryCount.new), color: "#047857", bg: "rgba(4,120,87,0.06)", border: "rgba(4,120,87,0.15)" },
    { label: "In Progress", value: String(inquiryCount.progress), color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)" },
    { label: "Responded", value: String(inquiryCount.responded), color: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.15)" },
    { label: "Archived", value: String(inquiryCount.archived), color: "#a3a3a3", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)" },
  ];

  const getStatusChip = (status: string) => {
    switch (status) {
      case "new": return { bg: "rgba(4,120,87,0.1)", color: "#047857", label: "New" };
      case "progress": return { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", label: "In Progress" };
      case "responded": return { bg: "rgba(168,85,247,0.1)", color: "#a855f7", label: "Responded" };
      case "archived": return { bg: "rgba(255,255,255,0.05)", color: "#a3a3a3", label: "Archived" };
      default: return { bg: "rgba(4,120,87,0.1)", color: "#047857", label: status };
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

  // ---- Form Handler ----
  const handleForm = async (id: string) => {
    setFormLoading(id);
    try {
      if (id === "reply" && selectedInquiry) {
        await replyToInquiry(selectedInquiry.id, {
          text: replyText || "Thanks for your interest!",
          senderId: user?.uid || "",
          senderName: user?.displayName || "Landlord",
        });
        setReplyText("");
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Reply sent! ✅", "success"), 300);
      } else if (id === "schedule" && selectedInquiry) {
        await markInquiryProgress(selectedInquiry.id);
        setScheduleDate(new Date().toISOString().split("T")[0]);
        setScheduleStartTime("10:00");
        setScheduleEndTime("10:30");
        setScheduleNotes("");
        setScheduleReminder(true);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Viewing scheduled! 📅", "success"), 300);
      } else if (id === "archive" && selectedInquiry) {
        await archiveInquiry(selectedInquiry.id);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Inquiry archived", "info"), 300);
      } else if (id === "decline" && selectedInquiry) {
        await archiveInquiry(selectedInquiry.id);
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Inquiry declined", "error"), 300);
      } else {
        setFormLoading(null); closeSheet();
        setTimeout(() => showSnackbar("Action completed", "success"), 300);
      }
    } catch (err: any) {
      setFormLoading(null);
      showSnackbar(err?.message || "Something went wrong", "error");
    }
  };

  // ---- Mark All Read ----
  const markAllRead = () => {
    showSnackbar("All inquiries marked as read", "success");
  };

  // ---- Schedule Viewing State ----
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [scheduleStartTime, setScheduleStartTime] = useState("10:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("10:30");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleReminder, setScheduleReminder] = useState(true);

  // ---- Quick Reply ----
  const [replyText, setReplyText] = useState("");

  // ---- Ripple ----
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

  // ---- Detail Tab State ----
  const [activeDetailTab, setActiveDetailTab] = useState("message");

  // ---- Selected inquiry for detail ----
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryData | null>(null);

  return (
    <AuthGuard>

    <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif" }}>
      <div className="app-shell">
        <div className="status-bar" />

        {/* ====== HEADER ====== */}
        <div className="app-header">
          <div className="flex items-center justify-between px-5 pt-2 pb-1">
            <div>
              <h1 className="text-xl font-bold text-white">Inquiries</h1>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>
                {inquiries.length} total • {inquiryCount.new} new
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openSheet("sort")}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <ArrowUpDown className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
              <button
                onClick={markAllRead}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <CheckCheck className="w-4 h-4" style={{ color: "#a3a3a3" }} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-2">
            <div className="relative" onClick={() => openSheet("search")}>
              <MessageCircle className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <div
                className="w-full py-3 pl-11 pr-12 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#525252" }}
              >
                Search inquiries, tenants...
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 px-5 py-2">
            {stats.map((s) => (
              <div key={s.label} className="p-2.5 rounded-xl text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {tabFilters.map((f) => (
              <div
                key={f.key}
                className={`inquiry-tab ${activeFilter === f.key ? "active" : ""}`}
                onClick={() => {
                  setActiveFilter(f.key);
                  const count = inquiries.filter((inq) => f.key === "all" || inq.status === f.key).length;
                  showSnackbar(`Showing ${count} inquiries`, "info");
                }}
              >
                {f.label}
                <span className="tab-count">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="app-content" id="main-content">
          <div className="px-5 pb-28 pt-3 space-y-2.5" id="inquiry-list">
            {filteredInquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <MessageCircle className="w-12 h-12 mb-3" style={{ color: "#525252" }} />
                <p className="text-base font-semibold text-white">No inquiries yet</p>
                <p className="text-sm mt-1" style={{ color: "#a3a3a3" }}>Inquiries from tenants will appear here</p>
              </div>
            ) : filteredInquiries.map((inq, i) => {
              const statusChip = getStatusChip(inq.status);
              const opacity = inq.status === "responded" || inq.status === "archived" ? 0.75 : 1;
              return (
                <div
                  key={inq.id}
                  className={`inquiry-card animate-in ${inq.unread ? "unread" : ""}`}
                  style={{ animationDelay: `${0.05 + i * 0.05}s`, opacity }}
                  data-status={inq.status}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    openSheet("detail");
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="inquiry-avatar" style={{ background: inq.tenantAvatarBg, color: inq.tenantAvatarColor }}>
                      {inq.tenantInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{inq.tenantName}</p>
                        <span className="text-xs" style={{ color: "#525252" }}>{formatCreatedAt(inq.createdAt)}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: inq.status === "new" ? "#047857" : "#3b82f6" }}>
                        {inq.propertyName}{inq.unitName ? ` — ${inq.unitName}` : ""}
                      </p>
                      <p className="text-xs mt-1 truncate" style={{ color: "#a3a3a3" }}>
                        {inq.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="chip" style={{ background: statusChip.bg, color: statusChip.color, fontSize: "10px", padding: "3px 8px" }}>
                          {statusChip.label}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInquiry(inq); openSheet("reply"); }}
                          className="chip cursor-pointer"
                          style={{ background: "rgba(4,120,87,0.08)", color: "#047857", fontSize: "10px", padding: "3px 10px" }}
                        >
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInquiry(inq); openSheet("scheduleViewing"); }}
                          className="chip cursor-pointer"
                          style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", fontSize: "10px", padding: "3px 10px" }}
                        >
                          <CalendarPlus className="w-3 h-3" /> Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="h-4" />
          </div>
        </div>

        {/* FAB */}
        <button
          onClick={() => router.push('/messages')}
          className="fixed z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl"
          style={{
            bottom: "80px",
            right: "20px",
            background: "linear-gradient(135deg,#047857,#059669)",
            boxShadow: "0 8px 32px rgba(4,120,87,0.4)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">New Inquiry</span>
        </button>

        {/* BOTTOM NAV */}
        <div className="app-bottom-nav">
          <div className="bottom-nav">
            <div className="flex">
              {[
                { key: "home", icon: LayoutDashboard, label: "Home", path: "/dashboard" },
                { key: "properties", icon: Building2, label: "Properties", path: "/properties" },
                { key: "listings", icon: List, label: "Listings", path: "/listings" },
                { key: "more", icon: Menu, label: "More" },
              ].map((item) => (
                <div
                  key={item.key}
                  className={`nav-item ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => {
                    if (item.key === "more") { openSheet("moreMenu"); return; }
                    setActiveTab(item.key);
                    if (item.path) router.push(item.path);
                  }}
                >
                  {activeTab === item.key && <div className="nav-indicator" />}
                  <item.icon className="w-5 h-5 nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== SHEETS ========== */}

      {/* SORT */}
      <div className={`sheet-overlay ${activeSheet === "sort" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "sort" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Sort Inquiries</h3>
          <div className="space-y-1">
            {["Newest First", "Oldest First", "By Property", "Unread First"].map((s) => (
              <div
                key={s}
                className="sort-option"
                onClick={() => {
                  setSortLabel(s);
                  setTimeout(() => closeSheet(), 200);
                }}
              >
                <div className={`sort-radio ${sortLabel === s ? "selected" : ""}`} />
                <span className={`text-sm font-medium ${sortLabel === s ? "text-white" : ""}`} style={sortLabel !== s ? { color: "#a3a3a3" } : {}}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className={`sheet-overlay ${activeSheet === "search" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "search" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 relative">
              <MessageCircle className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#525252" }} />
              <input type="text" className="android-input" style={{ paddingLeft: "44px", borderRadius: "14px" }} placeholder="Search inquiries..." autoFocus value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
            <button onClick={closeSheet} className="text-sm font-semibold" style={{ color: "#047857" }}>Cancel</button>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Recent Searches</h4>
          <div className="flex flex-wrap gap-2">
            {["Wanjiku", "Bedsitter", "Kilimani"].map((s) => (
              <button key={s} className="chip" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>
                <Clock className="w-3 h-3" /> {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DETAIL */}
      <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        {selectedInquiry && (<>
        <div className="p-5 pb-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="inquiry-avatar" style={{ background: selectedInquiry.tenantAvatarBg, color: selectedInquiry.tenantAvatarColor, width: "48px", height: "48px", fontSize: "15px" }}>
                {selectedInquiry.tenantInitials}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedInquiry.tenantName}</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>
                  {formatCreatedAt(selectedInquiry?.createdAt)} • <span style={{ color: selectedInquiry?.tenantAvatarColor || "#a3a3a3" }}>{getStatusChip(selectedInquiry?.status || "new").label}</span>
                </p>
              </div>
            </div>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex -mx-5 px-5 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {["message", "activity"].map((tab) => (
              <div
                key={tab}
                className={`detail-tab ${activeDetailTab === tab ? "active" : ""}`}
                onClick={() => setActiveDetailTab(tab)}
              >
                {tab === "message" ? "Message" : "Activity"}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5">
          {/* MESSAGE TAB */}
          {activeDetailTab === "message" && (
            <div className="pt-4 pb-6">
              {/* Property Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <img src={`https://picsum.photos/seed/apt-nairobi/80/80.jpg`} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{selectedInquiry.propertyName}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedInquiry?.unitName || selectedInquiry?.propertyName || ""}</p>
                </div>
                <span className="chip" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "10px" }}>Vacant</span>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-3 mb-4">
                {/* Original message (incoming) */}
                <div className="flex items-start gap-2" style={{ maxWidth: "85%" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: selectedInquiry.tenantAvatarBg }}>
                    <span className="text-xs font-bold" style={{ color: selectedInquiry.tenantAvatarColor, fontSize: "10px" }}>{selectedInquiry.tenantInitials}</span>
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
                      {selectedInquiry.message}
                    </p>
                    <p className="text-xs mt-2" style={{ color: "#525252" }}>{formatCreatedAt(selectedInquiry?.createdAt)}</p>
                  </div>
                </div>

                {/* Reply (outgoing) - only show if responded */}
                {(selectedInquiry.status === "responded") && (
                  <div className="flex items-start gap-2 justify-end" style={{ maxWidth: "85%", marginLeft: "auto" }}>
                    <div className="p-3 rounded-2xl rounded-tr-sm" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.2)" }}>
                      <p className="text-sm leading-relaxed text-white">
                        Thanks for your interest! Yes, the unit is available. When would you like to schedule a viewing?
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs" style={{ color: "#525252" }}>Yesterday</span>
                        <CheckCheck className="w-3.5 h-3.5" style={{ color: "#047857" }} />
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(4,120,87,0.15)" }}>
                      <span className="text-xs font-bold" style={{ color: "#047857", fontSize: "10px" }}>ME</span>
                    </div>
                  </div>
                )}

                {/* Follow-up from tenant */}
                {(selectedInquiry.status === "progress" || selectedInquiry.status === "responded") && (
                  <div className="flex items-start gap-2" style={{ maxWidth: "85%" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: selectedInquiry.tenantAvatarBg }}>
                      <span className="text-xs font-bold" style={{ color: selectedInquiry.tenantAvatarColor, fontSize: "10px" }}>{selectedInquiry.tenantInitials}</span>
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <p className="text-sm leading-relaxed" style={{ color: "#e5e5e5" }}>
                        That sounds great! I'm available this Thursday at 11am. Does that work for you?
                      </p>
                      <p className="text-xs mt-2" style={{ color: "#525252" }}>3h ago</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Reply Input */}
              <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1"
                    style={{ background: "transparent", border: "none", outline: "none", color: "white", fontSize: "14px" }}
                    placeholder="Type a reply..."
                  />
                  <button onClick={() => openSheet("reply")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(4,120,87,0.1)" }}>
                    <Reply className="w-4 h-4" style={{ color: "#047857" }} />
                  </button>
                </div>
              </div>

              {/* Primary Actions */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => { closeSheet(); setTimeout(() => openSheet("scheduleViewing"), 300); }} className="btn-secondary flex-1 flex items-center justify-center gap-2" style={{ padding: "10px" }}>
                  <CalendarPlus className="w-4 h-4" /><span className="text-sm">Schedule</span>
                </button>
                <button onClick={() => { closeSheet(); setTimeout(() => openSheet("actions"), 300); }} className="btn-secondary flex items-center justify-center gap-2" style={{ padding: "10px" }}>
                  <MoreHorizontal className="w-4 h-4" /><span className="text-sm">More</span>
                </button>
              </div>

              {/* Quick Contact */}
              <div className="flex items-center justify-center gap-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { icon: Phone, color: "#047857", bg: "rgba(4,120,87,0.1)", label: "Call" },
                  { icon: MessageCircle, color: "#25D366", bg: "rgba(37,211,102,0.1)", label: "WhatsApp" },
                  { icon: Smartphone, color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "SMS" },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const phone = selectedInquiry?.tenantPhone;
                      if (action.label === "Call" && phone) {
                        window.location.href = `tel:${phone}`;
                      } else if (action.label === "WhatsApp" && phone) {
                        window.open(`https://wa.me/${phone.replace(/^0/, '254').replace(/[^0-9]/g, '')}`, '_blank');
                      } else if (action.label === "SMS" && phone) {
                        window.location.href = `sms:${phone}`;
                      }
                    }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: action.bg }}>
                      <action.icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs" style={{ color: "#a3a3a3" }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {activeDetailTab === "activity" && (
            <div className="pt-4 pb-6">
              <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-4 h-4" style={{ color: "#525252" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "#a3a3a3" }}>Contact: <span className="text-white">{selectedInquiry.tenantPhone}</span></p>
                  </div>
                </div>
                <div className="flex gap-2">                      {[
                        { icon: Phone, color: "#047857", bg: "rgba(4,120,87,0.1)", label: "Call" },
                        { icon: MessageCircle, color: "#25D366", bg: "rgba(37,211,102,0.1)", label: "WhatsApp" },
                      ].map((a, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const phone = selectedInquiry?.tenantPhone;
                            if (a.label === "Call" && phone) {
                              window.location.href = `tel:${phone}`;
                            } else if (a.label === "WhatsApp" && phone) {
                              window.open(`https://wa.me/${phone.replace(/^0/, '254').replace(/[^0-9]/g, '')}`, '_blank');
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: a.bg, color: a.color }}
                        >
                          <a.icon className="w-3.5 h-3.5" /> {a.label}
                        </button>
                      ))}
                </div>
              </div>

              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#525252" }}>Timeline</h4>
              <div className="space-y-4">
                {[
                  { dot: "#047857", title: "Inquiry received", desc: `${selectedInquiry.tenantName} sent a message about ${selectedInquiry.propertyName}`, time: formatCreatedAt(selectedInquiry?.createdAt), icon: selectedInquiry.tenantInitials },
                  { dot: "#3b82f6", title: "Property viewed in listing", desc: `${selectedInquiry.propertyName} was viewed in search results`, time: "30m before inquiry" },
                  { dot: "#3b82f6", title: "Similar unit comparison", desc: "Compared with 2 other properties", time: "1h before inquiry" },
                  { dot: "#525252", title: "Prospect created account", desc: `${selectedInquiry.tenantName} joined Rentke platform`, time: "2 days ago" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    {i < 3 && <div className="act-line" />}
                    <div className="act-dot mt-1" style={{ background: item.dot, boxShadow: `0 0 8px ${item.dot}66` }} />
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>{item.desc}</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </>)}
      </div>

      {/* REPLY */}
      <div className={`sheet-overlay ${activeSheet === "reply" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "reply" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Reply</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>

          {/* Recipient */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="inquiry-avatar" style={{ background: selectedInquiry?.tenantAvatarBg, color: selectedInquiry?.tenantAvatarColor, width: "36px", height: "36px", fontSize: "11px" }}>
              {selectedInquiry?.tenantInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{selectedInquiry?.tenantName}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedInquiry?.propertyName || ""} — {selectedInquiry?.unitName || ""}</p>
            </div>
          </div>

          {/* Original message */}
          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-xs" style={{ color: "#525252" }}>
              Original: &quot;{(selectedInquiry?.message || "").substring(0, 80)}...&quot;
            </p>
          </div>

          {/* Reply textarea */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Your Reply</label>
            <textarea
              className="android-input"
              style={{ minHeight: "120px", borderRadius: "14px" }}
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </div>

          {/* Quick replies */}
          <div className="mt-3 mb-4">
            <p className="text-xs font-medium mb-2" style={{ color: "#525252" }}>Quick Replies</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Hi! Yes, the unit is still available. When would you like to view it?",
                "Thanks for your interest! Let me check and get back to you shortly.",
                "The unit has been taken, but I have similar options available. Would you like to see them?",
              ].map((qr, i) => (
                <button
                  key={i}
                  onClick={() => setReplyText(qr)}
                  className="chip cursor-pointer"
                  style={{ background: "rgba(4,120,87,0.08)", color: "#047857", fontSize: "11px" }}
                >
                  {i === 0 ? "Still available" : i === 1 ? "Will check" : "Already taken"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleForm("reply")}
            className="btn-primary ripple-container"
            disabled={formLoading === "reply"}
          >
            {formLoading === "reply" ? <div className="spinner mx-auto" /> : <span>Send Reply</span>}
          </button>
        </div>
      </div>

      {/* SCHEDULE VIEWING */}
      <div className={`sheet-overlay ${activeSheet === "scheduleViewing" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "scheduleViewing" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="sheet-handle" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Schedule Viewing</h3>
            <button onClick={closeSheet} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <XIcon className="w-4 h-4" style={{ color: "#a3a3a3" }} />
            </button>
          </div>

          {/* Tenant */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="inquiry-avatar" style={{ background: selectedInquiry?.tenantAvatarBg, color: selectedInquiry?.tenantAvatarColor, width: "36px", height: "36px", fontSize: "11px" }}>
              {selectedInquiry?.tenantInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{selectedInquiry?.tenantName}</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>{selectedInquiry?.propertyName || ""} — {selectedInquiry?.unitName || ""}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="input-group">
              <input type="date" className="android-input" placeholder=" " value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Date</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={scheduleStartTime} onChange={(e) => setScheduleStartTime(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>Start Time</label>
              </div>
              <div className="input-group">
                <input type="time" className="android-input" placeholder=" " value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} />
                <label style={{ top: "10px", fontSize: "11px", color: "#047857", fontWeight: 500 }}>End Time</label>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: "#a3a3a3" }}>Notes</label>
              <textarea className="android-input" style={{ minHeight: "60px", borderRadius: "14px" }} placeholder="Any special instructions..." value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div>
                <p className="text-sm font-medium text-white">Send reminder</p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>1 hour before viewing</p>
              </div>
              <div className={`toggle-track ${scheduleReminder ? "active" : ""}`} onClick={() => setScheduleReminder(!scheduleReminder)}>
                <div className="toggle-thumb" />
              </div>
            </div>
            <button
              onClick={() => handleForm("schedule")}
              className="btn-primary ripple-container"
              disabled={formLoading === "schedule"}
            >
              {formLoading === "schedule" ? <div className="spinner mx-auto" /> : <span>Schedule Viewing</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className={`sheet-overlay ${activeSheet === "actions" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "actions" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2"><h3 className="text-base font-bold text-white">More Actions</h3></div>
        <div className="px-3 pb-8">
          {[
            { icon: Mail, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", title: "Mark as Unread", desc: "Keep in new inquiries", snack: "Marked as unread" },
            { icon: Reply, color: "#047857", bg: "rgba(4,120,87,0.12)", title: "Reply", desc: "Send a message", sheet: "reply" },
            { icon: CalendarPlus, color: "#eab308", bg: "rgba(234,179,8,0.12)", title: "Schedule Viewing", desc: "Set a viewing date", sheet: "scheduleViewing" },
            { icon: Archive, color: "#a855f7", bg: "rgba(168,85,247,0.12)", title: "Archive", desc: "Move to archived", sheet: "archiveConfirm" },
            { icon: XCircle, color: "#ef4444", bg: "rgba(239,68,68,0.12)", title: "Decline", desc: "Mark as not interested", sheet: "declineConfirm", isDanger: true },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => {
                closeSheet();
                if (action.snack) {
                  setTimeout(() => showSnackbar(action.snack as string, "info"), 300);
                } else if (action.sheet) {
                  setTimeout(() => openSheet(action.sheet), 300);
                }
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl mt-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.bg }}>
                <action.icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${action.isDanger ? "" : "text-white"}`}
                   style={action.isDanger ? { color: "#ef4444" } : {}}>
                  {action.title}
                </p>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ARCHIVE CONFIRM */}
      <div className={`sheet-overlay ${activeSheet === "archiveConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "archiveConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Archive className="w-8 h-8" style={{ color: "#a855f7" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Archive Inquiry?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            This will move the inquiry to your archived tab. You can still access it later.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={() => handleForm("archive")}
              className="btn-primary flex-1"
              style={{ padding: "14px", background: "linear-gradient(to right,#7c3aed,#a855f7)", boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}
              disabled={formLoading === "archive"}
            >
              {formLoading === "archive" ? <div className="spinner mx-auto" /> : <span>Archive</span>}
            </button>
          </div>
        </div>
      </div>

      {/* DECLINE CONFIRM */}
      <div className={`sheet-overlay ${activeSheet === "declineConfirm" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "declineConfirm" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <XCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
          </div>
          <h3 className="text-lg font-bold text-white">Decline Inquiry?</h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: "#a3a3a3" }}>
            The tenant will be notified that the property is no longer available.
          </p>
          <div className="mt-4">
            <label className="text-xs font-medium block mb-2 text-left" style={{ color: "#a3a3a3" }}>Reason (optional)</label>
            <select className="android-select">
              {["Unit no longer available", "Requirements not met", "Already rented out", "Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={closeSheet} className="btn-secondary flex-1" style={{ padding: "14px" }}>Cancel</button>
            <button
              onClick={() => handleForm("decline")}
              className="btn-danger flex-1"
              style={{ padding: "14px" }}
              disabled={formLoading === "decline"}
            >
              {formLoading === "decline" ? <div className="spinner mx-auto" /> : <span>Decline</span>}
            </button>
          </div>
        </div>
      </div>

      {/* MORE MENU SHEET */}
      <div className={`sheet-overlay ${activeSheet === "moreMenu" ? "active" : ""}`} onClick={closeSheet} />
      <div className={`bottom-sheet ${activeSheet === "moreMenu" ? "active" : ""}`}>
        <div className="sheet-handle" />
        <div className="p-5 pb-2">
          <h3 className="text-lg font-bold text-white">More</h3>
          <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>All modules &amp; settings</p>
        </div>
        <div className="px-3 pb-8">
          {[
            { icon: MessageCircle, label: "Inquiries", desc: "3 new inquiries", color: "#047857", path: "/inquiries" },
            { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
            { icon: CalendarDays, label: "Viewings", desc: "8 viewing requests", color: "#eab308", path: "/viewings" },
            { icon: CalendarDays, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/calendar" },
            { icon: MessageSquare, label: "Messages", desc: "18 conversations", color: "#a855f7", path: "/messages" },
            { icon: DoorOpen, label: "Vacating", desc: "Move-out management", color: "#f97316", path: "/vacating" },
            { icon: BadgeCheck, label: "Rent Verification", desc: "Review & confirm payments", color: "#6366f1", path: "/rent-verification" },
            { icon: Megaphone, label: "Notices", desc: "Broadcast to tenants", color: "#f97316", path: "/notices" },
            { icon: MessageSquareWarning, label: "Complaints", desc: "Tenant issues & maintenance", color: "#ef4444", path: "/complaints" },
            { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
            { icon: Wrench, label: "Maintenance", desc: "", color: "#f97316", path: "/maintenance" },
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

      {/* SNACKBAR */}
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

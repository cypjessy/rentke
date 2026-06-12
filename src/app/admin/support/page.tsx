"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/app/components/AppBar";
import {
  Search,
  SlidersHorizontal,
  X,
  ShieldAlert,
  Tag,
  Lock,
  CreditCard,
  EyeOff,
  MessageSquare,
  Phone,
  UserPlus,
  RefreshCw,
  ExternalLink,
  Flag,
  Inbox,
  MoreVertical,
  Check,
  XCircle,
  Info,
  AlertTriangle,
  Wallet,
  LayoutDashboard,
  Users,
  Building2,
  Headset,
  Settings,
} from "lucide-react";
import {
  listenToTickets,
  replyToTicket,
  assignTicket,
  changeTicketStatus,
  type TicketData as FSTicketData,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/admin";

// ─── Types ───────────────────────────────────────────────────────────────────
type SnackbarType = "success" | "error" | "info" | "warning";
type PageKey = "dashboard" | "landlords" | "listings" | "wallet" | "settings" | "more";
type SheetKey = "detail" | "reply" | "assign" | "status" | "action" | "filter" | "menu";

interface SnackbarState {
  message: string;
  type: SnackbarType;
  visible: boolean;
}

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  "Scam Report": { icon: ShieldAlert, bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  "Listing Dispute": { icon: Tag, bg: "rgba(234,179,8,0.15)", color: "#eab308" },
  "Account Issue": { icon: Lock, bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  "Payment Issue": { icon: CreditCard, bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#3b82f6",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "#ef4444",
  "in-progress": "#3b82f6",
  escalated: "#a855f7",
  resolved: "#059669",
  closed: "#9ca3af",
};

const ASSIGNEES = [
  { init: "AK", name: "Admin Ke", color: "#047857", openTickets: 5 },
  { init: "BM", name: "Brian M.", color: "#3b82f6", openTickets: 3 },
  { init: "WK", name: "Wanjiru K.", color: "#a855f7", openTickets: 7 },
];

const FILTER_STATUS_OPTIONS = ["all", "open", "in-progress", "escalated", "resolved", "closed"] as const;
const PRIORITY_FILTERS = ["all", "high", "medium", "low"] as const;

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminSupport() {
  const router = useRouter();
  // ── State ──
  const [activePage, setActivePage] = useState<PageKey>("more");
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ message: "", type: "info", visible: false });

  // Firestore
  const [tickets, setTickets] = useState<FSTicketData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Ticket detail
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);

  // Reply
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyNotify, setReplyNotify] = useState(true);

  // Assign
  const [selectedAssignee, setSelectedAssignee] = useState("Admin Ke");

  // Status change
  const [selectedNewStatus, setSelectedNewStatus] = useState<TicketStatus>("open");

  // Filter sheet
  const [filterPriority, setFilterPriority] = useState("all");

  const snackbarTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Firestore ──
  useEffect(() => {
    setDataLoading(true);
    const unsub = listenToTickets(
      (data) => {
        setTickets(data);
        setDataLoading(false);
      },
      (err) => {
        console.error("Failed to load tickets:", err);
        setDataLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // ── Derived ──
  const currentTicket = currentTicketId ? tickets.find((t) => t.id === currentTicketId) ?? null : null;

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !t.reporter.toLowerCase().includes(q) && !t.property.toLowerCase().includes(q)) {
      return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    escalated: tickets.filter((t) => t.status === "escalated").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  // ── Snackbar ──
  const showSnackbar = useCallback((message: string, type: SnackbarType = "info") => {
    clearTimeout(snackbarTimeout.current);
    setSnackbar({ message, type, visible: true });
    snackbarTimeout.current = setTimeout(() => {
      setSnackbar((s) => ({ ...s, visible: false }));
    }, 3500);
  }, []);

  // ── Sheets ──
  const openSheet = useCallback((key: SheetKey) => setActiveSheet(key), []);
  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // ── Ripple ──
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest('.ripple-container') as HTMLElement | null;
      if (!container) return;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ── Search ──
  const toggleSearch = useCallback(() => {
    setSearchOpen((s) => !s);
    if (searchOpen) setSearchQuery("");
  }, [searchOpen]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
  }, []);

  // ── Ticket Detail ──
  const openTicketDetail = useCallback(
    (id: string) => {
      setCurrentTicketId(id);
      openSheet("detail");
    },
    [openSheet],
  );

  const actionItems = [
    {
      icon: MessageSquare,
      color: "#3b82f6",
      label: "Reply",
      onClick: () => { closeSheet(); setTimeout(() => openSheet("reply"), 200); },
    },
    {
      icon: UserPlus,
      color: "#a855f7",
      label: "Reassign",
      onClick: () => { closeSheet(); setTimeout(() => openSheet("assign"), 200); },
    },
    {
      icon: RefreshCw,
      color: "#eab308",
      label: "Change Status",
      onClick: () => { closeSheet(); setTimeout(() => openSheet("status"), 200); },
    },
    {
      icon: Phone,
      color: "#059669",
      label: "Call Reporter",
      onClick: () => { closeSheet(); setTimeout(() => showSnackbar(`Calling ${currentTicket?.phone || ""}...`, "info"), 200); },
    },
    {
      icon: ExternalLink,
      color: "#a3a3a3",
      label: "View Linked Listing",
      onClick: () => { closeSheet(); setTimeout(() => showSnackbar("Linked listing opened", "info"), 200); },
    },
    {
      icon: Flag,
      color: "#ef4444",
      label: "Flag User",
      onClick: () => { closeSheet(); setTimeout(() => showSnackbar("User account flagged for review", "warning"), 200); },
    },
  ];

  // ── Reply ──
  const applyQuickReply = useCallback((text: string) => {
    setReplyText(text);
  }, []);

  const sendReply = useCallback(() => {
    if (!replyText.trim() || !currentTicketId) {
      showSnackbar("Please type a reply", "error");
      return;
    }
    setReplySending(true);
    replyToTicket(currentTicketId, {
      text: replyText.trim(),
      senderId: "admin",
      senderName: "Admin Ke",
      notify: replyNotify,
    }).then(() => {
      setReplySending(false);
      closeSheet();
      setReplyText("");
      setTimeout(() => showSnackbar("💬 Reply sent & user notified", "success"), 300);
    }).catch((err) => {
      setReplySending(false);
      showSnackbar("Failed to send reply: " + err.message, "error");
    });
  }, [replyText, currentTicketId, replyNotify, closeSheet, showSnackbar]);

  // ── Assign ──
  const confirmAssign = useCallback(() => {
    if (!currentTicketId) return;
    assignTicket(currentTicketId, selectedAssignee).then(() => {
      closeSheet();
      setTimeout(() => showSnackbar(`Ticket assigned to ${selectedAssignee}`, "success"), 300);
    }).catch((err) => {
      showSnackbar("Failed to assign: " + err.message, "error");
    });
  }, [currentTicketId, selectedAssignee, closeSheet, showSnackbar]);

  // ── Status ──
  const confirmStatusChange = useCallback(() => {
    if (!currentTicketId) return;
    changeTicketStatus(currentTicketId, selectedNewStatus).then(() => {
      closeSheet();
      setTimeout(() => showSnackbar(`Status updated to ${selectedNewStatus.replace("-", " ")}`, "success"), 300);
    }).catch((err) => {
      showSnackbar("Failed to update status: " + err.message, "error");
    });
  }, [currentTicketId, selectedNewStatus, closeSheet, showSnackbar]);

  // ── Filter ──
  const applyFilters = useCallback(() => {
    closeSheet();
    setTimeout(() => showSnackbar("Filters applied", "success"), 200);
  }, [closeSheet, showSnackbar]);

  const resetFilters = useCallback(() => {
    setFilterPriority("all");
    setStatusFilter("all");
    setSearchQuery("");
    showSnackbar("Filters reset", "info");
  }, [showSnackbar]);

  // ── Nav items ──
  const navItems: { key: PageKey; icon: React.ElementType; label: string; sheet?: SheetKey }[] = [
    { key: "dashboard", icon: LayoutDashboard, label: "Home" },
    { key: "landlords", icon: Users, label: "Landlords" },
    { key: "listings", icon: Building2, label: "Listings" },
    { key: "wallet", icon: Wallet, label: "Wallet" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  // ── Status label helper ──
  const statusLabel = (s: TicketStatus) => {
    return s === "in-progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="admin-portal" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Status Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-60"
        style={{ height: "env(safe-area-inset-top, 24px)", minHeight: "24px", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}
      />

      {/* ──────────── MAIN CONTENT ──────────── */}
      <div style={{ paddingBottom: "80px" }}>
        {/* TOP APP BAR */}
        <AppBar
          title="Support"
          subtitle="Disputes & Tickets"
          backHref="/admin"
          actions={[
            { icon: Search, onClick: toggleSearch },
            { icon: SlidersHorizontal, onClick: () => openSheet("filter") },
          ]}
        />

        {/* SEARCH BAR */}
        {searchOpen && (
          <div className="px-5" style={{ animation: "slideInUp 0.3s ease" }}>
            <div className="search-bar mb-3">
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: "#525252" }} />
              <input type="text" placeholder="Search tickets, users, properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              {searchQuery && <button onClick={clearSearch}><X className="w-5 h-5" style={{ color: "#525252" }} /></button>}
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>{stats.open} Open</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
              <span className="text-xs font-semibold" style={{ color: "#3b82f6" }}>{stats.inProgress} In Progress</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#a855f7" }} />
              <span className="text-xs font-semibold" style={{ color: "#a855f7" }}>{stats.escalated} Escalated</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-shrink-0" style={{ background: "rgba(4,120,87,0.1)", border: "1px solid rgba(4,120,87,0.15)" }}>
              <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
              <span className="text-xs font-semibold" style={{ color: "#059669" }}>{stats.resolved} Resolved</span>
            </div>
          </div>
        </div>

        {/* FILTER CHIPS */}
        <div className="px-5 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {["all", "open", "in-progress", "escalated", "resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`filter-chip ${statusFilter === f ? "active" : ""}`}
              >
                {f === "all" ? "All" : f === "in-progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* TICKETS LIST */}
        <div className="px-5 space-y-3" style={{ animation: "slideInUp 0.5s ease" }}>
          {filteredTickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Inbox className="w-8 h-8" style={{ color: "#525252" }} />
              </div>
              <h3 className="text-base font-semibold text-white">No tickets found</h3>
              <p className="text-sm mt-1" style={{ color: "#525252" }}>Try adjusting your search or filters</p>
            </div>
          )}

          {filteredTickets.map((t) => {
            const catIcon = CATEGORY_ICONS[t.category] || { icon: ShieldAlert, bg: "rgba(239,68,68,0.15)", color: "#ef4444" };
            const CatIconComp = catIcon.icon;
            return (
              <div
                key={t.id}
                className={`ticket-card priority-${t.priority}`}
                onClick={() => openTicketDetail(t.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="cat-icon" style={{ background: catIcon.bg }}>
                    <CatIconComp className="w-[18px] h-[18px]" style={{ color: catIcon.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`priority-badge priority-${t.priority}`}>{t.priority.toUpperCase()}</span>
                      <span className={`status-badge status-${t.status}`} style={{ fontSize: "10px", padding: "2px 8px" }}>{statusLabel(t.status)}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{t.title}</h4>
                    <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>From: {t.reporter} ({t.role}) · {t.created}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: "#525252" }}>
                        <MessageSquare className="w-3 h-3 inline mr-1" />{t.messages}
                      </span>
                      <span className="text-xs" style={{ color: "#525252" }}>
                        Assigned: <span className="font-medium text-white">{t.assigned}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────── BOTTOM NAV ──────────── */}
      <div className="bottom-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <div
              key={item.key}
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => {
                if (item.key === "dashboard") router.push("/admin");
                else if (item.key === "landlords") router.push("/admin/landlords");
                else if (item.key === "listings") router.push("/admin/listings");
                else if (item.key === "wallet") router.push("/admin/wallet");
                else if (item.key === "settings") router.push("/admin/settings");
              }}
            >
              <item.icon className="w-5 h-5" style={{ color: activePage === item.key ? "#059669" : "#525252" }} />
              <span className="text-xs font-medium" style={{ color: activePage === item.key ? "#059669" : "#525252" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────── SHEETS ──────────── */}

      {/* OVERLAY */}
      <div className={`bottom-sheet-overlay ${activeSheet ? "active" : ""}`} onClick={closeSheet} />

      {/* -- TICKET DETAIL SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          {currentTicket && (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`priority-badge priority-${currentTicket.priority}`}>{currentTicket.priority.toUpperCase()}</span>
                    <span className={`status-badge status-${currentTicket.status}`} style={{ fontSize: "10px" }}>{statusLabel(currentTicket.status)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{currentTicket.title}</h3>
                </div>
                <button onClick={() => openSheet("action")} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <MoreVertical className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                </button>
              </div>

              {/* Reporter Info */}
              <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, ${currentTicket.color}, ${currentTicket.color}cc)`, color: "white" }}>
                    {currentTicket.init}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{currentTicket.reporter}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{currentTicket.role} · {currentTicket.phone}</p>
                  </div>
                  <button onClick={() => showSnackbar(`Calling ${currentTicket.phone}...`, "info")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.15)" }}>
                    <Phone className="w-4 h-4" style={{ color: "#059669" }} />
                  </button>
                </div>
              </div>

              {/* Ticket Meta */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Category", value: currentTicket.category },
                  { label: "Assigned To", value: currentTicket.assigned },
                  { label: "Property", value: currentTicket.property },
                  { label: "Created", value: currentTicket.created },
                ].map((row, i) => (
                  <div key={i} className="p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="text-xs" style={{ color: "#525252" }}>{row.label}</p>
                    <p className="text-sm font-medium text-white">{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mb-5">
                <p className="text-xs font-semibold mb-2" style={{ color: "#a3a3a3" }}>DESCRIPTION</p>
                <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{currentTicket.desc}</p>
              </div>

              {/* Activity Timeline */}
              <div className="mb-5">
                <p className="text-xs font-semibold mb-3" style={{ color: "#a3a3a3" }}>ACTIVITY TIMELINE</p>
                <div className="space-y-0">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="timeline-dot" style={{ borderColor: "#ef4444" }} />
                      <div className="timeline-line" style={{ flex: 1, minHeight: "40px" }} />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-white">Ticket created</p>
                      <p className="text-xs" style={{ color: "#525252" }}>{currentTicket.reporter} · {currentTicket.created}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="timeline-dot" style={{ borderColor: "#3b82f6" }} />
                      <div className="timeline-line" style={{ flex: 1, minHeight: "40px" }} />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-white">Assigned to <span className="font-semibold">{currentTicket.assigned}</span></p>
                      <p className="text-xs" style={{ color: "#525252" }}>System · {currentTicket.created}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="timeline-dot" style={{ borderColor: "#059669" }} />
                    </div>
                    <div>
                      <p className="text-sm text-white">Admin replied: "Thank you for reporting. We're investigating the listing."</p>
                      <p className="text-xs" style={{ color: "#525252" }}>Admin Ke · 1h ago</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button onClick={() => { closeSheet(); setTimeout(() => openSheet("reply"), 300); }} className="btn-primary w-full text-center ripple-container flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Reply
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { closeSheet(); setTimeout(() => openSheet("assign"), 300); }} className="btn-ghost flex-1 text-center text-sm">Assign</button>
                  <button onClick={() => { closeSheet(); setTimeout(() => openSheet("status"), 300); }} className="btn-ghost flex-1 text-center text-sm">Change Status</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- REPLY SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "reply" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-1">Reply to Ticket</h3>
          <p className="text-xs mb-4" style={{ color: "#a3a3a3" }}>{currentTicket?.title || ""}</p>

          <div className="mb-3">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>QUICK REPLIES</label>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {[
                { label: "🔍 Investigating", text: "Thank you for reporting this. We are investigating." },
                { label: "✅ Resolved", text: "We have removed the listing and warned the landlord." },
                { label: "📋 More Info", text: "Could you provide more details or screenshots?" },
                { label: "⬆️ Escalated", text: "This has been escalated to our senior team." },
              ].map((qr, i) => (
                <button
                  key={i}
                  onClick={() => applyQuickReply(qr.text)}
                  className="text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                >
                  {qr.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="android-input"
            rows={4}
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />

          <div className="flex items-center gap-3 mt-3 mb-4">
            <div
              className={`toggle-track ${replyNotify ? "active" : ""}`}
              onClick={() => setReplyNotify((s) => !s)}
            >
              <div className="toggle-thumb" />
            </div>
            <span className="text-sm" style={{ color: "#a3a3a3" }}>Notify user via SMS & email</span>
          </div>

          <div className="flex gap-3">
            <button onClick={closeSheet} className="btn-ghost flex-1 text-center">Cancel</button>
            <button onClick={sendReply} disabled={replySending} className="btn-primary flex-1 text-center ripple-container flex items-center justify-center gap-2">
              {replySending ? <><div className="spinner" /><span>Sending...</span></> : <span>Send Reply</span>}
            </button>
          </div>
        </div>
      </div>

      {/* -- ASSIGN SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "assign" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Assign Ticket</h3>
          <div className="space-y-2">
            {ASSIGNEES.map((a) => {
              const selected = selectedAssignee === a.name;
              return (
                <label
                  key={a.name}
                  className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer"
                  style={{
                    background: selected ? "rgba(4,120,87,0.08)" : "rgba(255,255,255,0.03)",
                    border: selected ? "1.5px solid rgba(4,120,87,0.2)" : "1.5px solid transparent",
                  }}
                  onClick={() => setSelectedAssignee(a.name)}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}dd)`, color: "white" }}>
                    {a.init}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{a.name}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{a.openTickets} open tickets</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selected ? "#059669" : "#525252" }}>
                    {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />}
                  </div>
                </label>
              );
            })}
          </div>
          <button onClick={confirmAssign} className="btn-primary w-full text-center ripple-container mt-4">Assign</button>
        </div>
      </div>

      {/* -- STATUS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "status" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Change Status</h3>
          <div className="space-y-2">
            {(["open", "in-progress", "escalated", "resolved", "closed"] as TicketStatus[]).map((s) => {
              const sel = selectedNewStatus === s;
              const color = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => setSelectedNewStatus(s)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
                  style={{
                    background: sel ? `${color}15` : "rgba(255,255,255,0.03)",
                    border: sel ? `1.5px solid ${color}33` : "1.5px solid transparent",
                  }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-sm font-semibold" style={{ color: sel ? color : "#a3a3a3" }}>{statusLabel(s)}</span>
                </button>
              );
            })}
          </div>
          <button onClick={confirmStatusChange} className="btn-primary w-full text-center ripple-container mt-4">Update Status</button>
        </div>
      </div>

      {/* -- ACTIONS SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "action" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#a3a3a3" }}>Actions</h3>
          <div className="space-y-1">
            {actionItems.map((action, i) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                  style={{ background: "transparent" }}
                >
                  <ActionIcon className="w-5 h-5" style={{ color: action.color }} />
                  <span className="text-sm font-medium text-white">{action.label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={closeSheet} className="btn-ghost w-full text-center mt-3">Cancel</button>
        </div>
      </div>

      {/* -- FILTER SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "filter" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={resetFilters} className="text-xs font-medium" style={{ color: "#059669" }}>Reset</button>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>PRIORITY</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_FILTERS.map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterPriority(v)}
                  className="text-xs font-medium px-3.5 py-2 rounded-full transition-all"
                  style={{
                    background: filterPriority === v ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                    border: filterPriority === v ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid rgba(255,255,255,0.08)",
                    color: filterPriority === v ? "#059669" : "#a3a3a3",
                  }}
                >
                  {v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
            <select className="android-input" style={{ appearance: "none" }}>
              <option value="all">All Categories</option>
              <option value="scam">Scam Report</option>
              <option value="payment">Payment Issue</option>
              <option value="listing">Listing Dispute</option>
              <option value="account">Account Issue</option>
            </select>
          </div>

          <div className="mb-5">
            <label className="text-xs font-semibold mb-3 block" style={{ color: "#a3a3a3" }}>SORT BY</label>
            <div className="space-y-2">
              {[
                { label: "Newest first", selected: true },
                { label: "Priority (High → Low)", selected: false },
              ].map((opt, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{
                    background: opt.selected ? "rgba(4,120,87,0.1)" : "rgba(255,255,255,0.03)",
                    border: opt.selected ? "1.5px solid rgba(4,120,87,0.3)" : "1.5px solid transparent",
                  }}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: opt.selected ? "#059669" : "#525252" }}>
                    {opt.selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />}
                  </div>
                  <span className="text-sm font-medium" style={{ color: opt.selected ? "#059669" : "#a3a3a3" }}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={applyFilters} className="btn-primary w-full text-center ripple-container">Apply Filters</button>
        </div>
      </div>

      {/* -- ADMIN MENU SHEET -- */}
      <div className={`bottom-sheet ${activeSheet === "menu" ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #047857, #059669)" }}>
              <span className="text-base font-bold text-white">AK</span>
            </div>
            <div>
              <p className="text-base font-semibold text-white">Admin Ke</p>
              <p className="text-xs" style={{ color: "#a3a3a3" }}>admin@rentke.co.ke</p>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
              { icon: Users, label: "Landlords", href: "/admin/landlords" },
              { icon: Building2, label: "Listings", href: "/admin/listings" },
              { icon: Wallet, label: "Wallet", href: "/admin/wallet" },
              { icon: Headset, label: "Support & Disputes", href: "/admin/support" },
              { icon: Settings, label: "Settings", href: "/admin/settings" },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => { closeSheet(); router.push(item.href); }}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                  style={{ background: "transparent" }}
                >
                  <ItemIcon className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => { closeSheet(); setTimeout(() => showSnackbar("Logged out successfully", "info"), 300); }} className="w-full flex items-center gap-4 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
              <XCircle className="w-5 h-5" style={{ color: "#ef4444" }} />
              <span className="text-sm font-medium" style={{ color: "#ef4444" }}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────── SNACKBAR ──────────── */}
      <div className={`snackbar ${snackbar.visible ? "show" : "hide"}`}>
        <div className="flex items-center gap-3">
          <div>
            {snackbar.type === "success" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}>
                <Check className="w-3.5 h-3.5" style={{ color: "#059669" }} />
              </div>
            )}
            {snackbar.type === "error" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}>
                <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
              </div>
            )}
            {snackbar.type === "info" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
                <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
              </div>
            )}
            {snackbar.type === "warning" && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.2)" }}>
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#eab308" }} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-white">{snackbar.message}</span>
          </div>
          <button onClick={() => setSnackbar((s) => ({ ...s, visible: false }))} className="p-1">
            <X className="w-4 h-4" style={{ color: "#525252" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  Building2,
  ChevronRight,
  MessageSquareWarning,
  Wallet,
  User,
  X,
  SlidersHorizontal,
  Droplets,
  Zap,
  Shield,
  Volume2,
  Sparkles,
  Send,
  Zap as ZapIcon,
  Phone,
  MessageCircle,
  RefreshCw,
  MessageSquare,
  Layers,
  DoorOpen,
  Camera,
  BadgeCheck,
  Megaphone,
  CalendarDays,
  Settings,
} from "lucide-react";

type ComplaintStatus = "open" | "progress" | "resolved" | "closed";
type Priority = "high" | "medium" | "low";

interface Reply {
  from: "tenant" | "landlord";
  text: string;
  time: string;
}

interface ComplaintData {
  id: number;
  tenant: string;
  init: string;
  color: string;
  unit: string;
  title: string;
  desc: string;
  category: string;
  status: ComplaintStatus;
  priority: Priority;
  time: string;
  hasPhoto: boolean;
  photoSeed: string;
  replies: Reply[];
}

const initialComplaints: ComplaintData[] = [
  { id: 0, tenant: "John Njoroge", init: "JN", color: "#3b82f6", unit: "Unit A2 · Kilimani Apt", title: "Water leak in bathroom", desc: "The bathroom tap is leaking badly, water is spreading to the hallway. Need urgent help!", category: "Plumbing", status: "open", priority: "high", time: "2h ago", hasPhoto: true, photoSeed: "leak-photo", replies: [{ from: "tenant", text: "Any update on this? Water is still leaking.", time: "1h ago" }, { from: "landlord", text: "Plumber is on the way. Should be there in 30 mins.", time: "45m ago" }] },
  { id: 1, tenant: "Faith Kerubo", init: "FK", color: "#eab308", unit: "Unit 4 · Westlands Studio", title: "Flickering lights in bedroom", desc: "The bedroom lights keep flickering since yesterday evening. Seems like a wiring issue.", category: "Electrical", status: "open", priority: "medium", time: "5h ago", hasPhoto: false, photoSeed: "", replies: [{ from: "landlord", text: "I'll send an electrician tomorrow morning.", time: "3h ago" }] },
  { id: 2, tenant: "Sarah Wambui", init: "SW", color: "#a855f7", unit: "Unit B1 · Karen House", title: "Broken main door lock", desc: "Main door lock is jammed, can't secure the house properly. This is a security risk.", category: "Security", status: "progress", priority: "high", time: "1d ago", hasPhoto: true, photoSeed: "lock-broken", replies: [{ from: "landlord", text: "Locksmith scheduled for today 2 PM.", time: "20h ago" }, { from: "tenant", text: "He came but said he needs a new lock mechanism. Will return tomorrow.", time: "4h ago" }, { from: "landlord", text: "Okay, I'll buy the replacement lock today.", time: "2h ago" }, { from: "tenant", text: "Thank you!", time: "1h ago" }] },
  { id: 3, tenant: "David Mutua", init: "DM", color: "#0891b2", unit: "Unit 3 · Rongai Bedsitter", title: "Noise from construction next door", desc: "The neighbor's construction starts at 6 AM, very loud and disturbing. Can anything be done?", category: "Noise", status: "progress", priority: "low", time: "3d ago", hasPhoto: false, photoSeed: "", replies: [{ from: "landlord", text: "I'll talk to the neighbor and the area chief.", time: "2d ago" }, { from: "landlord", text: "Spoke to them. They agreed to start at 8 AM going forward.", time: "1d ago" }, { from: "tenant", text: "Still starting early but slightly better.", time: "12h ago" }] },
  { id: 4, tenant: "Alice Njeri", init: "AN", color: "#6b7280", unit: "Unit 2 · Kilimani Apt", title: "Common area not cleaned", desc: "The staircase and lobby haven't been cleaned in 2 weeks.", category: "Cleaning", status: "resolved", priority: "low", time: "5d ago", hasPhoto: false, photoSeed: "", replies: [{ from: "landlord", text: "Cleaner has been notified. Will be done today.", time: "4d ago" }, { from: "tenant", text: "Done. Thank you!", time: "3d ago" }, { from: "landlord", text: "Great! Marking as resolved.", time: "3d ago" }] },
];

const statCards = [
  { key: "open", label: "Open", color: "#ef4444" },
  { key: "progress", label: "In Progress", color: "#3b82f6" },
  { key: "resolved", label: "Resolved", color: "#059669" },
] as const;

const filterOptions = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
] as const;

const priorityLabels: Record<Priority, string> = { high: "URGENT", medium: "MEDIUM", low: "LOW" };
const statusLabels: Record<ComplaintStatus, string> = { open: "Open", progress: "In Progress", resolved: "Resolved", closed: "Closed" };

const priorityColors: Record<Priority, string> = { high: "#ef4444", medium: "#eab308", low: "#3b82f6" };
const statusColors: Record<ComplaintStatus, string> = { open: "#ef4444", progress: "#3b82f6", resolved: "#059669", closed: "#9ca3af" };

const categoryIcons: Record<string, { icon: typeof Droplets; color: string; bg: string }> = {
  Plumbing: { icon: Droplets, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  Electrical: { icon: Zap, color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  Security: { icon: Shield, color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  Noise: { icon: Volume2, color: "#9ca3af", bg: "rgba(107,114,128,0.15)" },
  Cleaning: { icon: Sparkles, color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
};

const quickReplies = [
  "I've noted this. Looking into it.",
  "A technician has been scheduled for tomorrow.",
  "Issue resolved. Please confirm.",
  "We need access to your unit on [date].",
];

const statusOptions: { key: ComplaintStatus; label: string; color: string }[] = [
  { key: "open", label: "Open", color: "#ef4444" },
  { key: "progress", label: "In Progress", color: "#3b82f6" },
  { key: "resolved", label: "Resolved", color: "#059669" },
  { key: "closed", label: "Closed", color: "#9ca3af" },
];

const AppShell = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <>
    <div className="status-bar-fixed" />
    <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-40" style={{ background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)", marginTop: -1 }}>
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          <p className="text-xs" style={{ color: "#a3a3a3" }}>Tenant issues & maintenance</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <FilterSheetToggle />
      </div>
    </div>
    {children}
    <BottomNav />
  </>
);

const RippleContainer = ({ children, className = "", style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: (e: React.MouseEvent) => void }) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onClick?.(e);
  };
  return (
    <div className={`ripple-container ${className}`} style={style} onClick={handleClick}>
      {children}
    </div>
  );
};

const BottomNav = () => {
  return (
    <div className="bottom-nav">
      <div className="flex items-center justify-around">
        {[
          { icon: LayoutDashboard, label: "Home" },
          { icon: Building2, label: "Properties" },
          { icon: MessageSquareWarning, label: "Complaints", active: true },
          { icon: Wallet, label: "Payments" },
          { icon: User, label: "Profile" },
        ].map((item) => (
          <button key={item.label} className={`nav-item ${item.active ? "active" : ""}`}>
            <item.icon className="w-5 h-5" style={{ color: item.active ? "#059669" : "#525252" }} />
            <span className="text-[10px] font-medium" style={{ color: item.active ? "#059669" : "#525252" }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const FilterSheetToggle = () => {
  const [open, setOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
        <SlidersHorizontal className="w-5 h-5" style={{ color: "#a3a3a3" }} />
      </button>
      {open && (
        <>
          <div className="sheet-overlay active" onClick={() => setOpen(false)} />
          <div className="bottom-sheet active" style={{ maxHeight: "92dvh" }}>
            <div className="bottom-sheet-handle" />
            <div className="p-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Filters</h3>
                <button onClick={() => { setPriorityFilter("all"); }} className="text-xs font-medium" style={{ color: "#059669" }}>Reset</button>
              </div>
              <div className="mb-5">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PRIORITY</label>
                <div className="flex gap-2">
                  {["all", "high", "medium", "low"].map((v) => (
                    <button key={v} onClick={() => setPriorityFilter(v)} className={`filter-chip ${priorityFilter === v ? "active" : ""}`}>{v === "all" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="mb-5">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CATEGORY</label>
                <select className="android-input" style={{ appearance: "none" }}>
                  <option>All Categories</option>
                  <option>Plumbing</option>
                  <option>Electrical</option>
                  <option>Security</option>
                  <option>Noise</option>
                  <option>Cleaning</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="mb-5">
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PROPERTY</label>
                <select className="android-input" style={{ appearance: "none" }}>
                  <option>All Properties</option>
                  <option>2BR Apartment — Kilimani</option>
                  <option>4BR House — Karen</option>
                  <option>Bedsitter — Rongai</option>
                  <option>Studio — Westlands</option>
                </select>
              </div>
              <button onClick={() => { setOpen(false); showSnackbar("Filters applied", "success"); }} className="btn-primary w-full text-center">Apply</button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Snackbar
let snackbarTimeout: ReturnType<typeof setTimeout> | null = null;
const showSnackbar = (msg: string, type: "success" | "error" | "info" = "info") => {
  const el = document.getElementById("app-snackbar");
  const text = document.getElementById("snackbar-text");
  const icon = document.getElementById("snackbar-icon");
  if (!el || !text || !icon) return;
  text.textContent = msg;
  const icons = {
    success: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(4,120,87,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>',
    error: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(239,68,68,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>',
    info: '<div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:rgba(59,130,246,0.2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>',
  };
  icon.innerHTML = icons[type] || icons.info;
  el.classList.remove("hide");
  el.classList.add("show");
  if (snackbarTimeout) clearTimeout(snackbarTimeout);
  snackbarTimeout = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hide");
    setTimeout(() => el.classList.remove("hide"), 300);
  }, 3500);
};

const Snackbar = () => (
  <div id="app-snackbar" className="snackbar">
    <div className="flex items-center gap-3">
      <div id="snackbar-icon" />
      <div className="flex-1"><p id="snackbar-text" className="text-sm font-medium text-white" /></div>
      <button onClick={() => {
        const el = document.getElementById("app-snackbar");
        if (el) { el.classList.remove("show"); el.classList.add("hide"); setTimeout(() => el.classList.remove("hide"), 300); }
      }} className="p-1">
        <X className="w-4 h-4" style={{ color: "#525252" }} />
      </button>
    </div>
  </div>
);

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintData[]>(initialComplaints);
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<ComplaintStatus | null>(null);

  const current = complaints[currentIdx];

  const getStatusCount = (status: ComplaintStatus) => complaints.filter((c) => c.status === status).length;

  const filteredComplaints = activeFilter === "all" ? complaints : complaints.filter((c) => c.status === activeFilter);

  const handleStatusChange = (newStatus: ComplaintStatus) => {
    setComplaints((prev) => prev.map((c, i) => (i === currentIdx ? { ...c, status: newStatus } : c)));
    setShowStatusSheet(false);
    setTimeout(() => showSnackbar(`Status updated to ${statusLabels[newStatus]}`, "success"), 300);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      showSnackbar("Please type a message", "error");
      return;
    }
    setComplaints((prev) =>
      prev.map((c, i) =>
        i === currentIdx
          ? { ...c, replies: [...c.replies, { from: "landlord" as const, text: replyText.trim(), time: "Just now" }] }
          : c
      )
    );
    setReplyText("");
    setTimeout(() => {
      const thread = document.getElementById("chat-thread");
      if (thread) thread.scrollTop = thread.scrollHeight;
    }, 50);
    showSnackbar("Reply sent", "success");
  };

  const applyQuickReply = (text: string) => {
    setReplyText(text);
    setShowQuickReplies(false);
    setTimeout(() => document.getElementById("reply-input")?.focus(), 100);
  };

  return (
    <div style={{ paddingTop: "env(safe-area-inset-top, 24px)", paddingBottom: 80 }}>
      <AppShell title="Complaints">

      {/* Stats */}
      <div className="px-5 space-y-5" style={{ animation: "slideInUp 0.5s ease" }}>
        <div className="grid grid-cols-3 gap-2">
          {statCards.map((s) => (
            <button key={s.key} onClick={() => setActiveFilter(s.key)} className="stat-card text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{getStatusCount(s.key as ComplaintStatus)}</p>
              <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {filterOptions.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Complaints list */}
        <div className="space-y-3">
          {filteredComplaints.map((c) => {
            const CategoryIcon = categoryIcons[c.category]?.icon || MessageSquare;
            return (
              <button key={c.id} onClick={() => { setCurrentIdx(c.id); setShowQuickReplies(false); }} className="complaint-card" style={{ borderLeftColor: priorityColors[c.priority], width: "100%", textAlign: "left" }} data-status={c.status}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`priority-badge p-${c.priority}`}>{priorityLabels[c.priority]}</span>
                    <span className={`status-badge status-${c.status}`} style={{ fontSize: 10 }}>{statusLabels[c.status]}</span>
                  </div>
                  <span className="text-xs" style={{ color: "#525252" }}>{c.time}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="cat-icon" style={{ background: categoryIcons[c.category]?.bg || "rgba(255,255,255,0.05)" }}>
                    <CategoryIcon className="w-4 h-4" style={{ color: categoryIcons[c.category]?.color || "#a3a3a3" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                    <p className="text-xs" style={{ color: "#525252" }}>{c.tenant} · {c.unit}</p>
                  </div>
                </div>
                <p className="text-xs mb-2 line-clamp-2" style={{ color: "#a3a3a3" }}>{c.desc}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#525252" }}>
                    <MessageSquare className="w-3 h-3 inline" style={{ marginRight: 2 }} /> {c.replies.length} replies
                  </span>
                  <span className="text-xs" style={{ color: categoryIcons[c.category]?.color || "#a3a3a3" }}>{c.category}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Sheet */}
      {current && (
        <DetailSheet
          complaint={current}
          idx={currentIdx}
          onClose={() => setShowQuickReplies(false)}
          replyText={replyText}
          onReplyTextChange={setReplyText}
          onSendReply={handleSendReply}
          onOpenQuickReplies={() => setShowQuickReplies(true)}
          onOpenStatusSheet={() => setShowStatusSheet(true)}
          showQuickReplies={showQuickReplies}
          onApplyQuickReply={applyQuickReply}
          onCloseQuickReplies={() => setShowQuickReplies(false)}
          showStatusSheet={showStatusSheet}
          onCloseStatusSheet={() => setShowStatusSheet(false)}
          selectedNewStatus={selectedNewStatus}
          onSelectNewStatus={setSelectedNewStatus}
          onConfirmStatusChange={handleStatusChange}
        />
      )}

      {/* More Sheet */}
      <div className={`sheet-overlay ${showMore ? "active" : ""}`} onClick={() => setShowMore(false)} />
      <div className={`bottom-sheet ${showMore ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">More</h3>
          <div className="space-y-1">
            {[
              { icon: MessageCircle, label: "Inquiries", desc: "3 new inquiries", color: "#047857", path: "/inquiries" },
              { icon: Layers, label: "Units", desc: "8 units across 4 properties", color: "#3b82f6", path: "/units" },
              { icon: CalendarDays, label: "Calendar", desc: "Viewings & schedule", color: "#eab308", path: "/calendar" },
              { icon: MessageSquare, label: "Messages", desc: "18 conversations", color: "#a855f7", path: "/messages" },
              { icon: DoorOpen, label: "Vacating", desc: "Move-out management", color: "#f97316", path: "/vacating" },
              { icon: BadgeCheck, label: "Rent Verification", desc: "Review & confirm payments", color: "#6366f1", path: "/rent-verification" },
              { icon: Megaphone, label: "Notices", desc: "Broadcast to tenants", color: "#ec4899", path: "/notices" },
              { icon: Settings, label: "Settings", desc: "Account & preferences", color: "#525252", path: "/settings" },
            ].map((item, i) => (
              <button key={i} className="flex items-center gap-3 w-full p-3 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs" style={{ color: "#525252" }}>{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Snackbar />
      </AppShell>

      <style jsx>{`
        .ripple-container:active { transform: scale(0.96); }
        .complaint-card { background: #1A1D21; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,0.05); border-left: 4px solid transparent; transition: all 0.15s ease; }
        .complaint-card:active { transform: scale(0.98); }
        .cat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      `}</style>
    </div>
  );
}

// Separate DetailSheet component to keep the main component clean
function DetailSheet({
  complaint, idx, onClose, replyText, onReplyTextChange, onSendReply, onOpenQuickReplies, onOpenStatusSheet,
  showQuickReplies, onApplyQuickReply, onCloseQuickReplies, showStatusSheet, onCloseStatusSheet, selectedNewStatus, onSelectNewStatus, onConfirmStatusChange,
}: {
  complaint: ComplaintData; idx: number; onClose: () => void; replyText: string; onReplyTextChange: (v: string) => void; onSendReply: () => void; onOpenQuickReplies: () => void; onOpenStatusSheet: () => void;
  showQuickReplies: boolean; onApplyQuickReply: (t: string) => void; onCloseQuickReplies: () => void; showStatusSheet: boolean; onCloseStatusSheet: () => void; selectedNewStatus: ComplaintStatus | null; onSelectNewStatus: (s: ComplaintStatus) => void; onConfirmStatusChange: (s: ComplaintStatus) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const CategoryIcon = categoryIcons[complaint.category]?.icon || MessageSquare;

  return (
    <>
      {/* Open button */}
      <div className="fixed bottom-24 right-5 z-30">
        <RippleContainer onClick={() => setShowDetail(true)} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #047857, #059669)" }}>
          <MessageSquareWarning className="w-6 h-6 text-white" />
        </RippleContainer>
      </div>

      {/* Detail overlay & sheet */}
      <div className={`sheet-overlay ${showDetail ? "active" : ""}`} onClick={() => setShowDetail(false)} />
      <div className={`bottom-sheet ${showDetail ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`priority-badge p-${complaint.priority}`}>{priorityLabels[complaint.priority]}</span>
              <span className={`status-badge status-${complaint.status}`} style={{ fontSize: 10 }}>{statusLabels[complaint.status]}</span>
            </div>
            <button onClick={onOpenStatusSheet} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}>Update</button>
          </div>
          <h3 className="text-base font-bold text-white mb-2">{complaint.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `linear-gradient(135deg, ${complaint.color}, ${complaint.color}cc)`, color: "white" }}>
              {complaint.init}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{complaint.tenant}</p>
              <p className="text-xs" style={{ color: "#525252" }}>{complaint.unit}</p>
            </div>
          </div>
        </div>

        {/* Complaint content */}
        <div className="px-5 pb-3">
          <div className="p-3 rounded-xl mb-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{complaint.desc}</p>
            {complaint.hasPhoto && (
              <div className="mt-3">
                <div className="w-full h-32 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => showSnackbar("Full screen viewer coming soon", "info")}><Camera className="w-8 h-8" style={{ color: '#525252' }} /></div>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-xs font-medium" style={{ color: categoryIcons[complaint.category]?.color || "#a3a3a3" }}>{complaint.category}</span>
              <span className="text-xs" style={{ color: "#525252" }}>{complaint.time}</span>
            </div>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold mb-3" style={{ color: "#525252" }}>CONVERSATION</p>
          <div id="chat-thread" className="flex flex-col gap-3 mb-4" style={{ maxHeight: "40dvh", overflowY: "auto" }}>
            {complaint.replies.map((r, i) => (
              <div key={i} className={`flex flex-col ${r.from === "landlord" ? "items-end" : "items-start"}`}>
                <div className={`chat-bubble ${r.from === "landlord" ? "bubble-landlord" : "bubble-tenant"}`}>{r.text}</div>
                <span className="text-[10px] mt-1" style={{ color: "#525252" }}>{r.from === "landlord" ? "You" : "Tenant"} · {r.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reply Bar */}
        <div className="px-5 pb-8">
          <div className="flex items-end gap-2">
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "10px 14px", display: "flex", alignItems: "flex-end", gap: 2, flex: 1 }}>
              <textarea
                id="reply-input"
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white"
                style={{ resize: "none", maxHeight: 80, caretColor: "#047857" }}
                placeholder="Type a reply…"
              />
              <button onClick={onOpenQuickReplies} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                <ZapIcon className="w-4 h-4" style={{ color: "#525252" }} />
              </button>
            </div>
            <button onClick={onSendReply} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #047857, #059669)" }}>
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => showSnackbar("Calling tenant…", "info")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Phone className="w-4 h-4" style={{ color: "#059669" }} />
            </button>
            <button onClick={() => showSnackbar("Opening WhatsApp…", "info")} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
            </button>
            <button onClick={onOpenStatusSheet} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <RefreshCw className="w-4 h-4" style={{ color: "#a855f7" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Replies Sheet */}
      <div className={`sheet-overlay ${showQuickReplies ? "active" : ""}`} onClick={onCloseQuickReplies} />
      <div className={`bottom-sheet ${showQuickReplies ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#a3a3a3" }}>Quick Replies</h3>
          <div className="space-y-2">
            {quickReplies.map((qr, i) => (
              <button key={i} onClick={() => onApplyQuickReply(qr)} className="w-full text-left p-3 rounded-xl transition-all" style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="text-sm text-white">{qr}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Sheet */}
      <div className={`sheet-overlay ${showStatusSheet ? "active" : ""}`} onClick={onCloseStatusSheet} />
      <div className={`bottom-sheet ${showStatusSheet ? "active" : ""}`}>
        <div className="bottom-sheet-handle" />
        <div className="p-5 pb-8">
          <h3 className="text-lg font-bold text-white mb-4">Update Status</h3>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onSelectNewStatus(opt.key)}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all"
                style={{
                  background: selectedNewStatus === opt.key ? `${opt.color}15` : "rgba(255,255,255,0.03)",
                  border: selectedNewStatus === opt.key ? `1.5px solid ${opt.color}33` : "1.5px solid transparent",
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: opt.color }} />
                <span className="text-sm font-semibold" style={{ color: selectedNewStatus === opt.key ? opt.color : "#a3a3a3" }}>{opt.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => { if (selectedNewStatus) { onConfirmStatusChange(selectedNewStatus); onCloseStatusSheet(); setShowDetail(false); } else { showSnackbar("Select a status", "error"); } }} className="btn-primary w-full text-center mt-4" style={{ opacity: selectedNewStatus ? 1 : 0.4 }}>Update</button>
        </div>
      </div>
    </>
  );
}

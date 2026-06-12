"use client";

import { useState, useEffect, useRef } from "react";
import BottomNavAndMenu from "@/app/components/BottomNavAndMenu";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  MessageSquareWarning,
  ArrowLeft,
  LayoutDashboard,
  Building2,
  Menu,
  ChevronRight,
  X,
  Check,
  Info,
  Plus,
  MoreVertical,
  Copy,
  RefreshCw,
  Download,
  Trash2,
  CalendarX,
  CalendarDays,
  MessageSquare,
  MessageCircle,
  Mail,
  Smartphone,
  Layers,
  Settings,
  BadgeCheck,
  DoorOpen,
} from "lucide-react";
import AuthGuard from "../components/AuthGuard";

type SnackbarType = "success" | "error" | "info";
type NoticeStatus = "sent" | "scheduled" | "draft";
type NoticePriority = "urgent" | "important" | "general";

interface NoticeData {
  title: string;
  message: string;
  priority: NoticePriority;
  status: NoticeStatus;
  channels: string[];
  audience: string;
  property: string;
  time: string;
  delivery: Record<string, string>;
  readCount: number;
  total: number;
}

const initialNotices: NoticeData[] = [
  { title: "🚨 Water Supply Interruption", message: "There will be no water supply on Saturday 18th January from 8AM to 4PM due to Nairobi Water maintenance. Please store enough water beforehand. We apologize for the inconvenience.", priority: "urgent", status: "sent", channels: ["app", "sms", "whatsapp"], audience: "All Tenants (23)", property: "All Properties", time: "2 hours ago", delivery: { app: "23/23", sms: "20/23", whatsapp: "22/23" }, readCount: 18, total: 23 },
  { title: "💰 January Rent Due Reminder", message: "This is a friendly reminder that January rent is due by 5th January. Please pay via M-Pesa Paybill 123456 and upload the confirmation.", priority: "important", status: "sent", channels: ["app", "sms"], audience: "All Tenants (23)", property: "All Properties", time: "1 day ago", delivery: { app: "23/23", sms: "23/23" }, readCount: 22, total: 23 },
  { title: "🔧 Elevator Maintenance — Block B", message: "Elevator in Block B will undergo maintenance on Monday 20th January. Please use the staircase during this period.", priority: "general", status: "scheduled", channels: ["app", "whatsapp"], audience: "Block B Tenants (8)", property: "Kilimani Apartment", time: "Scheduled Mon 8:00 AM", delivery: {}, readCount: 0, total: 8 },
  { title: "📋 New Parking Policy", message: "Starting February 1st, all tenants must register their vehicles at the management office. Unregistered vehicles will be clamped and a release fee of KSh 2,000 applies.", priority: "important", status: "draft", channels: [], audience: "All Tenants (23)", property: "All Properties", time: "Created 3h ago", delivery: {}, readCount: 0, total: 23 },
  { title: "🎉 Happy New Year!", message: "Wishing all our tenants a prosperous 2025! Thank you for being part of the RentKe community. We appreciate your tenancy.", priority: "general", status: "sent", channels: ["app", "email"], audience: "All Tenants (23)", property: "All Properties", time: "Jan 1", delivery: { app: "21/23", email: "19/23" }, readCount: 21, total: 23 },
];

const priorityMeta: Record<NoticePriority, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "URGENT", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" },
  important: { label: "IMPORTANT", color: "#eab308", bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.3)" },
  general: { label: "GENERAL", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)" },
};

const statusMeta: Record<NoticeStatus, { label: string; color: string; bg: string }> = {
  sent: { label: "Sent", color: "#059669", bg: "rgba(4,120,87,0.15)" },
  scheduled: { label: "Scheduled", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  draft: { label: "Draft", color: "#9ca3af", bg: "rgba(107,114,128,0.15)" },
};

const channelMeta: Record<string, { label: string; color: string; bg: string }> = {
  app: { label: "In-App", color: "#059669", bg: "rgba(4,120,87,0.15)" },
  sms: { label: "SMS", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  whatsapp: { label: "WhatsApp", color: "#25D366", bg: "rgba(37,211,102,0.15)" },
  email: { label: "Email", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
};

export default function NoticesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("notices");

  // ---- Filter ----
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // ---- Sheet State ----
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  // ---- Notices State ----
  const [notices, setNotices] = useState<NoticeData[]>(initialNotices);

  // ---- Create/Edit Form ----
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formPriority, setFormPriority] = useState<NoticePriority>("urgent");
  const [formAudience, setFormAudience] = useState("all");
  const [formSchedule, setFormSchedule] = useState("now");
  const [channels, setChannels] = useState({
    app: true,
    sms: true,
    whatsapp: false,
    email: false,
  });

  // ---- Loading ----
  const [loading, setLoading] = useState<string | null>(null);

  // ---- Snackbar ----
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; type: SnackbarType }>({ show: false, message: "", type: "info" });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarAnimClass, setSnackbarAnimClass] = useState("");

  const statusCounts = {
    sent: notices.filter((n) => n.status === "sent").length,
    scheduled: notices.filter((n) => n.status === "scheduled").length,
    draft: notices.filter((n) => n.status === "draft").length,
  };

  const filteredNotices = activeFilter === "all" ? notices : notices.filter((n) => n.status === activeFilter);

  const n = notices[currentIdx];

  // ---- Snackbar ----
  useEffect(() => {
    if (snackbar.show) {
      setSnackbarVisible(true);
      setSnackbarAnimClass("show");
    } else {
      setSnackbarAnimClass("hide");
      const t = setTimeout(() => { setSnackbarVisible(false); setSnackbarAnimClass(""); }, 300);
      return () => clearTimeout(t);
    }
  }, [snackbar.show]);

  const showSnackbar = (message: string, type: SnackbarType = "info") => {
    setSnackbar({ show: true, message, type });
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    snackbarTimeoutRef.current = setTimeout(() => setSnackbar({ show: false, message: "", type: "info" }), 4000);
  };

  const hideSnackbar = () => setSnackbar({ show: false, message: "", type: "info" });

  const openSheet = (name: string) => setActiveSheet(name);
  const closeSheet = () => setActiveSheet(null);

  // ---- Notice Detail ----
  const openNoticeDetail = (idx: number) => { setCurrentIdx(idx); openSheet("detail"); };

  // ---- Create/Edit ----
  const openCreateNotice = () => {
    setIsEditing(false);
    setFormTitle("");
    setFormMessage("");
    setFormPriority("urgent");
    setFormAudience("all");
    setFormSchedule("now");
    setChannels({ app: true, sms: true, whatsapp: false, email: false });
    openSheet("create");
  };

  const openEditNotice = (idx: number) => {
    setCurrentIdx(idx);
    setIsEditing(true);
    const notice = notices[idx];
    setFormTitle(notice.title.replace(/^[^\s]+ /, ""));
    setFormMessage(notice.message);
    setFormPriority(notice.priority);
    openSheet("create");
  };

  const openNoticeActions = () => openSheet("actions");
  const closeNoticeActions = () => closeSheet();

  // ---- Cancel / Delete ----
  const openCancelSheet = (idx: number) => { setCurrentIdx(idx); openSheet("cancel"); };
  const openDeleteSheet = (idx: number) => { setCurrentIdx(idx); openSheet("delete"); };

  // ---- Templates ----
  const openTemplates = () => openSheet("templates");

  const applyTemplate = (title: string, msg: string) => {
    setFormTitle(title);
    setFormMessage(msg);
    closeSheet();
    setTimeout(() => openSheet("create"), 100);
    showSnackbar("Template applied", "info");
  };

  // ---- Save Draft ----
  const saveDraft = () => {
    closeSheet();
    showSnackbar("Draft saved", "success");
  };

  // ---- Send Notice ----
  const sendNotice = () => {
    if (!formTitle.trim()) { showSnackbar("Please add a title", "error"); return; }
    setLoading("send");
    setTimeout(() => {
      setLoading(null);
      closeSheet();
      setTimeout(() => {
        if (formSchedule === "now") {
          showSnackbar("📢 Notice sent to 23 tenants via In-App & SMS", "success");
        } else {
          showSnackbar("⏰ Notice scheduled for Monday 8:00 AM", "success");
        }
      }, 300);
    }, 2000);
  };

  // ---- Send Now ----
  const sendNow = (idx: number) => {
    setNotices((prev) => prev.map((n, i) => (i === idx ? { ...n, status: "sent" as NoticeStatus } : n)));
    showSnackbar("📢 Notice sent immediately", "success");
  };

  // ---- Confirm Cancel ----
  const confirmCancel = () => {
    setNotices((prev) => prev.map((n, i) => (i === currentIdx ? { ...n, status: "draft" as NoticeStatus } : n)));
    closeSheet();
    showSnackbar("Notice moved to drafts", "info");
  };

  // ---- Confirm Delete ----
  const confirmDelete = () => {
    closeSheet();
    showSnackbar("Notice deleted permanently", "error");
  };

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

  const snackbarIcon = () => {
    switch (snackbar.type) {
      case "success": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(4,120,87,0.2)" }}><Check className="w-3.5 h-3.5" style={{ color: "#059669" }} /></div>;
      case "error": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.2)" }}><X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} /></div>;
      case "info": return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}><Info className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} /></div>;
    }
  };

  const channelIcons: Record<string, React.ReactNode> = {
    app: <Smartphone className="w-3 h-3" />,
    sms: <MessageSquare className="w-3 h-3" />,
    whatsapp: <MessageCircle className="w-3 h-3" />,
    email: <Mail className="w-3 h-3" />,
  };

  return (
    <AuthGuard>
      <div style={{ background: "#050505", color: "#e5e5e5", fontFamily: "'Inter', sans-serif", minHeight: "100dvh" }}>
        <div className="app-shell">
          <div className="status-bar" />

          {/* ====== HEADER ====== */}
          <div className="app-header">
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <ArrowLeft className="w-5 h-5" style={{ color: "#a3a3a3" }} />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-white">Notices</h1>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>Broadcast to tenants</p>
                </div>
              </div>
              <button
                onClick={openCreateNotice}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(to right,#047857,#059669)", color: "white", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
              >
                <Plus className="w-4 h-4" /> New Notice
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 px-5 py-1">
              <div className="p-3 rounded-xl" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-semibold" style={{ color: "#059669" }}>Sent</p>
                <p className="text-xl font-bold text-white">{statusCounts.sent}</p>
                <p className="text-xs" style={{ color: "#525252" }}>This month</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-semibold" style={{ color: "#eab308" }}>Scheduled</p>
                <p className="text-xl font-bold text-white">{statusCounts.scheduled}</p>
                <p className="text-xs" style={{ color: "#525252" }}>Pending</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "#1A1D21", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-semibold" style={{ color: "#a3a3a3" }}>Drafts</p>
                <p className="text-xl font-bold text-white">{statusCounts.draft}</p>
                <p className="text-xs" style={{ color: "#525252" }}>Unsent</p>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 px-5 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {[
                { key: "all", label: "All" },
                { key: "sent", label: "Sent" },
                { key: "scheduled", label: "Scheduled" },
                { key: "draft", label: "Drafts" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ====== CONTENT ====== */}
          <div className="app-content">
            <div className="px-5 pb-28 space-y-3 pt-2">
              {filteredNotices.map((item, idx) => {
                const realIdx = notices.indexOf(item);
                const pm = priorityMeta[item.priority];
                const sm = statusMeta[item.status];
                return (
                  <div
                    key={idx}
                    className="card animate-in"
                    style={{
                      padding: "14px",
                      animationDelay: `${idx * 0.05}s`,
                      cursor: "pointer",
                    }}
                    onClick={() => item.status === "draft" ? openEditNotice(realIdx) : openNoticeDetail(realIdx)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="chip text-[10px] font-bold" style={{ background: pm.bg, color: pm.color, letterSpacing: "0.5px" }}>
                        {pm.label}
                      </span>
                      <span className="chip" style={{ background: sm.bg, color: sm.color, fontSize: "10px", padding: "3px 8px" }}>
                        {sm.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: "#a3a3a3" }}>{item.message}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {item.channels.map((ch) => (
                          <span
                            key={ch}
                            className="chip text-[10px] font-semibold"
                            style={{ background: channelMeta[ch]?.bg || "rgba(255,255,255,0.05)", color: channelMeta[ch]?.color || "#a3a3a3", padding: "2px 8px", gap: "3px" }}
                          >
                            {channelIcons[ch]}
                            {channelMeta[ch]?.label || ch}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: "#525252" }}>{item.time}</span>
                    </div>
                    {item.status === "sent" && (
                      <div className="flex items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center gap-1.5">
                          <div className="delivery-bar" style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", flex: "1", overflow: "hidden", width: "64px" }}>
                            <div
                              className="delivery-fill"
                              style={{
                                width: `${Math.round((item.readCount / Math.max(item.total, 1)) * 100)}%`,
                                height: "100%",
                                borderRadius: "3px",
                                background: "#059669",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color: "#059669" }}>
                            {Math.round((item.readCount / Math.max(item.total, 1)) * 100)}%
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: "#525252" }}>{item.readCount} of {item.total} delivered</span>
                        <div className="flex-1" />
                        <button onClick={(e) => { e.stopPropagation(); openNoticeDetail(realIdx); }} className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                          Details
                        </button>
                      </div>
                    )}
                    {item.status === "scheduled" && (
                      <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); sendNow(realIdx); }}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                          style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                        >
                          Send Now
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditNotice(realIdx); }}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#a3a3a3" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openCancelSheet(realIdx); }}
                          className="text-xs font-semibold py-2 px-3 rounded-lg"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {item.status === "draft" && (
                      <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditNotice(realIdx); }}
                          className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                          style={{ background: "rgba(4,120,87,0.15)", color: "#059669" }}
                        >
                          Edit & Send
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteSheet(realIdx); }}
                          className="text-xs font-semibold py-2 px-3 rounded-lg"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        <BottomNavAndMenu />
      </div>

        {/* ============================================ */}
        {/* SHEET: CREATE / EDIT NOTICE */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "create" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "create" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{isEditing ? "Edit Notice" : "New Notice"}</h3>
              <button onClick={saveDraft} className="text-xs font-medium" style={{ color: "#eab308" }}>Save Draft</button>
            </div>

            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>PRIORITY</label>
                <div className="flex gap-2">
                  {(["urgent", "important", "general"] as const).map((p) => {
                    const pm = priorityMeta[p];
                    const selected = formPriority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setFormPriority(p)}
                        className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                        style={{
                          background: selected ? pm.bg : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${selected ? pm.border : "rgba(255,255,255,0.08)"}`,
                          color: selected ? pm.color : "#a3a3a3",
                        }}
                      >
                        {p === "urgent" ? "🚨 Urgent" : p === "important" ? "⚠️ Important" : "📢 General"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>TITLE</label>
                <input
                  type="text"
                  className="android-input"
                  placeholder="e.g. Water Supply Interruption"
                  maxLength={100}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
                <p className="text-xs mt-1 text-right" style={{ color: "#525252" }}>{formTitle.length}/100</p>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>MESSAGE</label>
                <textarea
                  className="android-input"
                  rows={5}
                  placeholder="Type your notice here…"
                  maxLength={1000}
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                />
                <p className="text-xs mt-1 text-right" style={{ color: "#525252" }}>{formMessage.length}/1000</p>
              </div>

              {/* Audience */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>SEND TO</label>
                <div className="space-y-2">
                  {["all", "property", "unit"].map((opt) => {
                    const selected = formAudience === opt;
                    return (
                      <div
                        key={opt}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                        style={{
                          background: selected ? "rgba(4,120,87,0.08)" : "rgba(255,255,255,0.02)",
                          border: `1.5px solid ${selected ? "rgba(4,120,87,0.2)" : "transparent"}`,
                        }}
                        onClick={() => setFormAudience(opt)}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: selected ? "#059669" : "#525252" }}
                        >
                          {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#059669" }} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">
                            {opt === "all" ? "All Tenants" : opt === "property" ? "By Property" : "By Unit"}
                          </p>
                          <p className="text-xs" style={{ color: "#525252" }}>
                            {opt === "all" ? "23 tenants across 4 properties" : opt === "property" ? "Select specific property" : "Select specific unit(s)"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Channels */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>CHANNELS</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["app", "sms", "whatsapp", "email"] as const).map((ch) => {
                    const cm = channelMeta[ch];
                    return (
                      <div
                        key={ch}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="chip text-[10px] font-semibold" style={{ background: cm.bg, color: cm.color, padding: "2px 8px" }}>
                            {cm.label}
                          </span>
                        </div>
                        <div
                          className={`toggle-track ${channels[ch] ? "active" : ""}`}
                          onClick={() => setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }))}
                        >
                          <div className="toggle-thumb" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "#a3a3a3" }}>SCHEDULE</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormSchedule("now")}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                    style={{
                      background: formSchedule === "now" ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${formSchedule === "now" ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: formSchedule === "now" ? "#059669" : "#a3a3a3",
                    }}
                  >
                    Send Now
                  </button>
                  <button
                    onClick={() => setFormSchedule("later")}
                    className="text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                    style={{
                      background: formSchedule === "later" ? "rgba(4,120,87,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${formSchedule === "later" ? "rgba(4,120,87,0.3)" : "rgba(255,255,255,0.08)"}`,
                      color: formSchedule === "later" ? "#059669" : "#a3a3a3",
                    }}
                  >
                    Schedule
                  </button>
                </div>
                {formSchedule === "later" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input type="date" className="android-input" defaultValue="2025-01-20" style={{ appearance: "none" }} />
                    <input type="time" className="android-input" defaultValue="08:00" style={{ appearance: "none" }} />
                  </div>
                )}
              </div>

              {/* Templates */}
              <button
                onClick={() => { closeSheet(); setTimeout(openTemplates, 100); }}
                className="w-full flex items-center justify-between p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-sm font-medium" style={{ color: "#a3a3a3" }}>📋 Use a template</span>
                <ChevronRight className="w-4 h-4" style={{ color: "#525252" }} />
              </button>

              {/* Cost Estimate */}
              <div className="p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.12)" }}>
                <p className="text-xs" style={{ color: "#eab308" }}>
                  <span className="font-semibold">💰 Cost estimate:</span> 23 SMS × KSh 1.50 = <span className="font-bold">KSh 34.50</span> · WhatsApp & In-App are free
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={sendNotice}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#047857,#059669)", boxShadow: "0 4px 15px rgba(4,120,87,0.3)" }}
                disabled={loading === "send"}
              >
                {loading === "send" ? <div className="spinner mx-auto" /> : <span>{formSchedule === "now" ? "Send Notice" : "Schedule Notice"}</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: NOTICE DETAIL */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "detail" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "detail" ? "active" : ""}`} style={{ maxHeight: "95dvh" }}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            {n && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="chip text-[10px] font-bold" style={{ background: priorityMeta[n.priority].bg, color: priorityMeta[n.priority].color, letterSpacing: "0.5px" }}>
                      {priorityMeta[n.priority].label}
                    </span>
                    <span className="chip" style={{ background: statusMeta[n.status].bg, color: statusMeta[n.status].color, fontSize: "10px" }}>
                      {statusMeta[n.status].label}
                    </span>
                  </div>
                  <button onClick={openNoticeActions} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <MoreVertical className="w-4 h-4" style={{ color: "#a3a3a3" }} />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{n.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#a3a3a3" }}>{n.message}</p>

                {/* Meta */}
                <div className="space-y-0 mb-5">
                  <div className="flex justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#525252" }}>Sent</span>
                    <span className="text-xs font-medium text-white">{n.time}</span>
                  </div>
                  <div className="flex justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#525252" }}>Audience</span>
                    <span className="text-xs font-medium text-white">{n.audience}</span>
                  </div>
                  <div className="flex justify-between py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#525252" }}>Channels</span>
                    <span className="text-xs flex gap-1">
                      {n.channels.map((ch) => (
                        <span key={ch} className="chip text-[9px] font-semibold" style={{ background: channelMeta[ch]?.bg, color: channelMeta[ch]?.color, padding: "2px 6px" }}>
                          {channelMeta[ch]?.label || ch}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-xs" style={{ color: "#525252" }}>Property</span>
                    <span className="text-xs font-medium text-white">{n.property}</span>
                  </div>
                </div>

                {/* Delivery Stats */}
                {n.status === "sent" && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold mb-3" style={{ color: "#a3a3a3" }}>DELIVERY STATUS</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-3 rounded-xl" style={{ background: "rgba(4,120,87,0.08)" }}>
                        <p className="text-base font-bold" style={{ color: "#059669" }}>{n.readCount}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Delivered</p>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.08)" }}>
                        <p className="text-base font-bold" style={{ color: "#eab308" }}>{n.total - n.readCount}</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Pending</p>
                      </div>
                      <div className="text-center p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
                        <p className="text-base font-bold" style={{ color: "#ef4444" }}>1</p>
                        <p className="text-xs" style={{ color: "#525252" }}>Failed</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(n.delivery).map(([ch, val]) => {
                        const [delivered, total] = val.split("/").map(Number);
                        const pct = Math.round((delivered / Math.max(total, 1)) * 100);
                        return (
                          <div key={ch}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs" style={{ color: "#a3a3a3" }}>{channelMeta[ch]?.label || ch}</span>
                              <span className="text-xs font-medium" style={{ color: pct >= 100 ? "#059669" : "#eab308" }}>{val}</span>
                            </div>
                            <div className="delivery-bar" style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", flex: "1", overflow: "hidden" }}>
                              <div className="delivery-fill" style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: pct >= 100 ? "#059669" : "#eab308" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Read Receipts */}
                {n.status === "sent" && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold" style={{ color: "#a3a3a3" }}>READ RECEIPTS</p>
                      <span className="text-xs" style={{ color: "#525252" }}>{n.readCount} of {n.total} read</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { init: "JN", name: "John Njoroge", read: true },
                        { init: "SW", name: "Sarah Wambui", read: true },
                        { init: "DM", name: "David Mutua", read: false },
                      ].map((tenant, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#333", color: "#e5e5e5" }}>
                            {tenant.init}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-white">{tenant.name}</p>
                          </div>
                          <span className="text-xs" style={{ color: tenant.read ? "#059669" : "#525252" }}>
                            {tenant.read ? "Read" : "Not read"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => showSnackbar("Showing all read receipts", "info")} className="text-xs font-medium mt-2 block w-full text-center py-2" style={{ color: "#3b82f6" }}>
                      View all {n.total} tenants
                    </button>
                  </div>
                )}

                {/* Actions */}
                <button
                  onClick={() => { closeSheet(); setTimeout(openCreateNotice, 300); }}
                  className="btn-ghost w-full text-center flex items-center justify-center gap-2"
                  style={{ padding: "12px" }}
                >
                  <Copy className="w-4 h-4" /> Resend / Duplicate
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: NOTICE ACTIONS */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "actions" ? "active" : ""}`} onClick={closeNoticeActions} />
        <div className={`bottom-sheet ${activeSheet === "actions" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-4">
            <div className="space-y-1">
              {[
                { icon: Copy, color: "#3b82f6", label: "Duplicate Notice", onClick: () => { closeNoticeActions(); closeSheet(); setTimeout(openCreateNotice, 300); } },
                { icon: RefreshCw, color: "#eab308", label: "Resend to Failed", onClick: () => { closeNoticeActions(); closeSheet(); showSnackbar("Resending to failed recipients…", "success"); } },
                { icon: Download, color: "#a3a3a3", label: "Download Report", onClick: () => { closeNoticeActions(); closeSheet(); showSnackbar("Downloading delivery report…", "info"); } },
                { icon: Trash2, color: "#ef4444", label: "Delete Notice", onClick: () => { closeNoticeActions(); closeSheet(); setTimeout(() => openDeleteSheet(currentIdx), 300); }, danger: true },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl"
                >
                  <action.icon className="w-5 h-5" style={{ color: action.color }} />
                  <span className="text-sm font-medium" style={{ color: action.danger ? action.color : "white" }}>{action.label}</span>
                </button>
              ))}
            </div>
            <button onClick={closeNoticeActions} className="btn-ghost w-full text-center mt-3" style={{ padding: "12px" }}>Cancel</button>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: CANCEL SCHEDULED */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "cancel" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "cancel" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                <CalendarX className="w-5 h-5" style={{ color: "#eab308" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cancel Schedule</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{n?.title?.replace(/^[^\s]+ /, "") || ""}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)" }}>
              <p className="text-xs" style={{ color: "#eab308" }}>⚠ This will cancel the scheduled notice. You can re-schedule it later from drafts.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Keep</button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#d97706,#f59e0b)", boxShadow: "0 4px 15px rgba(217,119,6,0.3)" }}
              >
                Move to Drafts
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: DELETE */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "delete" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "delete" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <Trash2 className="w-5 h-5" style={{ color: "#ef4444" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Notice</h3>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{n?.title?.replace(/^[^\s]+ /, "") || ""}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p className="text-xs" style={{ color: "#ef4444" }}>⚠ This action is permanent. The notice will be removed for everyone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={closeSheet} className="btn-ghost flex-1 text-center" style={{ padding: "12px" }}>Cancel</button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
                style={{ background: "linear-gradient(to right,#dc2626,#ef4444)", boxShadow: "0 4px 15px rgba(220,38,38,0.3)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* SHEET: TEMPLATES */}
        {/* ============================================ */}
        <div className={`sheet-overlay ${activeSheet === "templates" ? "active" : ""}`} onClick={closeSheet} />
        <div className={`bottom-sheet ${activeSheet === "templates" ? "active" : ""}`}>
          <div className="bottom-sheet-handle" />
          <div className="p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Quick Templates</h3>
            </div>
            <div className="space-y-2">
              {[
                { title: "🚨 Urgent Maintenance", desc: "Water, electricity, elevator issues", msg: "There will be a [issue] on [date] from [time]. Please [action]. We apologize for the inconvenience." },
                { title: "💰 Rent Due Reminder", desc: "Monthly rent collection", msg: "Friendly reminder that [month] rent of KSh [amount] is due by [date]. Please pay via M-Pesa Paybill 123456." },
                { title: "📋 Policy Update", desc: "New rules & policies", msg: "Starting [date], [new policy]. Please comply to avoid [consequence]. Contact us if you have questions." },
                { title: "🎉 Holiday Greeting", desc: "Festive & seasonal messages", msg: "Wishing all our tenants a happy [holiday]! Enjoy your celebrations. 🎊" },
                { title: "🔒 Security Alert", desc: "Safety & security notices", msg: "We have noticed [security concern] in the area. Please [safety tips]. Report any incidents to [contact]." },
              ].map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(tpl.title, tpl.msg)}
                  className="w-full p-3.5 rounded-xl text-left"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-sm font-semibold text-white">{tpl.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#525252" }}>{tpl.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={closeSheet} className="btn-ghost w-full text-center mt-4" style={{ padding: "12px" }}>Cancel</button>
          </div>
        </div>

        {/* ============================================ */}


        {/* SNACKBAR */}
        {snackbarVisible && (
          <div className={`snackbar ${snackbarAnimClass}`}>
            <div className="flex items-center gap-3">
              <div>{snackbarIcon()}</div>
              <div className="flex-1"><p className="text-sm font-medium text-white">{snackbar.message}</p></div>
              <button onClick={hideSnackbar} className="p-1"><X className="w-4 h-4" style={{ color: "#525252" }} /></button>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
